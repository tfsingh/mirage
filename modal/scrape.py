import csv
from modal import web_endpoint, Stub, Image

stub = Stub("flora-scrape")

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
async def traverse(items):
    from collections import deque

    user_url = items['url']
    depth = items['depth']
    rules = items['rules']

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
async def scrape_page(items):
    from playwright.async_api import async_playwright

    url = items['url']
    rules = items['rules']
    text_data = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        page = await browser.new_page()
        
        await page.goto(url)
        
        for selector in rules['valid_selectors']:
            texts = await page.eval_on_selector_all(selector, "elements => elements.map(element => element.innerText)")
            text_data.extend(texts)
        
        await browser.close()
    
    return text_data, url

@stub.function()
async def scrape(items):
    links = await traverse.remote.aio(items)
    data = []
    params = ({'url': url, 'rules': items['rules']} for url in links)
    for text, url in scrape_page.map(params, return_exceptions=True):
        data.append((url, text))
    return data
    
@stub.local_entrypoint()
def main():
    result = scrape.remote({
        "url": "https://modal.com/docs/examples",
        "depth": 300,
        "rules": {
            "must_start_with": "https://modal.com/docs/",
            "ignore_fragments": True,
            'valid_selectors': ['p', 'code']
        }
    })
    print(result)
    print(len(result))
    csv_file_name = 'returned_data.csv'

    with open(csv_file_name, mode='w', newline='') as file:
        writer = csv.writer(file)

        writer.writerow(['URL', 'Text'])

        writer.writerows(result) 