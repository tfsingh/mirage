import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';

export function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
        </Routes>
    );
}
