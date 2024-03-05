import csv
from typing import Dict
from modal import web_endpoint, Stub, Image, Secret
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

stub = Stub("flora-scrape")

auth_scheme = HTTPBearer()

playwright_image = Image.debian_slim(python_version="3.10").run_commands(
    "apt-get update",
    "apt-get install -y software-properties-common",
    "apt-add-repository non-free",
    "apt-add-repository contrib",
    "pip install ray playwright==1.30.0",
    "playwright install-deps chromium",
    "playwright install chromium",
)

@stub.function(image=playwright_image)
async def get_links(url, rules):
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(url)
        links = await page.eval_on_selector_all("a[href]", "elements => elements.map(element => element.href)")

        if rules['must_start_with']:
            links = list(filter(lambda x: x.startswith(rules['must_start_with']), links))
        if rules['ignore_fragments']:
            links = [url.split('#')[0] for url in links]

        await browser.close()

    return links

@stub.function(image=playwright_image)
async def traverse(item: Dict):
    from collections import deque

    user_url = item['url']
    depth = item['depth']
    rules = item['rules']

    seen_links = set()
    visited_links = set()

    n = len(seen_links)
    prev_len = -1

    to_scrape = deque([user_url])

    while to_scrape and n < depth and n != prev_len:
        prev_len = n

        url = to_scrape.popleft()

        while to_scrape and url in visited_links:
            url = to_scrape.popleft()
        visited_links.add(url)


        new_links = await get_links.remote.aio(url, rules)

        seen_links.update(new_links)
        [to_scrape.append(link) for link in new_links]

        n = len(seen_links)

    return list(seen_links)[:n]


@stub.function(image=playwright_image)
async def scrape_page(item: Dict):
    from playwright.async_api import async_playwright

    url = item['url']
    rules = item['rules']
    text_data = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        page = await browser.new_page()

        await page.goto(url)

        for selector in rules['valid_selectors']:
            texts = await page.eval_on_selector_all(selector, "elements => elements.map(element => element.innerText)")
            text_data.extend(texts)

        await browser.close()

    return url, "\n".join(text_data)

@stub.function(secrets=[Secret.from_name("flora-token")], timeout=40)
@web_endpoint(method="POST")
async def scrape(item: Dict, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    import os

    if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect bearer token",
                headers={"WWW-Authenticate": "Bearer"},
        )

    if item['depth'] > 300:
        return "Cannot exceed depth 300"

    links = await traverse.remote.aio(item)
    data = []
    params = ({'url': url, 'rules': item['rules']} for url in links)
    for url, text in scrape_page.map(params, return_exceptions=True):
        #data.append((url, text))
        data.append(text)
    return data

