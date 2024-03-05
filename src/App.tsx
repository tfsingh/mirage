import React, { useState } from 'react';
import './App.css';

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [currentView, setCurrentView] = useState('upload');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [ignoreFragments, setIgnoreFragments] = useState(false);
  const [depth, setDepth] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files ? event.target.files[0] : null;
    setFile(uploadedFile);
    if (uploadedFile) {
      setName(uploadedFile.name);
      // You can handle the file submission here or in a separate function
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const tag = event.target.value;
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const handleBaseUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBaseUrl(event.target.value);
  };

  const handleIgnoreFragmentsChange = () => {
    setIgnoreFragments(!ignoreFragments);
  };

  const handleDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDepth(event.target.value);
  };

  const handleSubmitUrl = (event: React.FormEvent) => {
    event.preventDefault();
    console.log(name)
    console.log(url)
    console.log(selectedTags)
    console.log(baseUrl)
    console.log(ignoreFragments)
    console.log(depth)
  };

  const handleSubmitFile = () => {
    console.log(file);
  };


  if (currentView === 'upload') {
    return (
      <div className="flex justify-center items-center flex-col">
        <div className="flex justify-center items-center mb-4">
          <img src="/flora.png" width={75} alt="Flora" />
          <h1 className='text-5xl'>Flora</h1>
        </div>
        <form className="flex flex-col justify-center items-center">
          <label className="block mb-2">
            <span className="sr-only">Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[#1a1a1a]"
              onChange={handleFileChange}
            />
          </label>
          or
          <input
            type="text"
            placeholder="Enter URL"
            className="mt-2 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-[#1a1a1a] focus:outline-none"
            value={url}
            onChange={handleUrlChange}
          />
          <button
            type="button"
            className="mt-4 px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-700"
            onClick={() => {
              if (file) {
                handleSubmitFile()
              } else if (url) {
                setCurrentView('form');
              }
            }}
          >
            {file ? 'Submit' : 'Next'}
          </button>
        </form>
      </div>
    );
  } else if (currentView === 'form' && url) {
    // This view is shown only if a URL was entered
    return (
      <form onSubmit={handleSubmitUrl} className="flex flex-col justify-center items-center">
        <input
          type="text"
          placeholder="Name"
          className="mb-4 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-500 focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="block mb-2">HTML Tags:</label>
          {['h1', 'h2', 'h3', 'p', 'code', 'pre', 'div'].map((tag) => (
            <div key={tag}>
              <input
                type="checkbox"
                value={tag}
                onChange={handleTagChange}
                checked={selectedTags.includes(tag)}
              /> {tag}
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Base URL"
          value={baseUrl}
          onChange={handleBaseUrlChange}
          className="mt-4 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-500 focus:outline-none"
        />
        <div className="flex items-center mt-4">
          <input
            type="checkbox"
            checked={ignoreFragments}
            onChange={handleIgnoreFragmentsChange}
          />
          <label className="ml-2">Ignore Fragments</label>
        </div>
        <input
          type="number"
          placeholder="Depth"
          value={depth}
          onChange={handleDepthChange}
          className="mt-4 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-4 px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    );
  }
};

export default App;
