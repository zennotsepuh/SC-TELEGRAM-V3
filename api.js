const axios = require('axios');
const config = require('./config');

const api = axios.create({
    baseURL: config.BASE_URL,
    timeout: 20000
});

api.interceptors.request.use((req) => {
    req.params = { ...(req.params || {}), apikey: config.API_KEY };
    return req;
});

module.exports = {
    getProfile: () => api.get('/profile').then(r => r.data),
    getCountries: (server) => api.get('/countries', { params: { server } }).then(r => r.data),
    createDeposit: (nominal, code) => api.get('/deposit/create', { params: { nominal, code } }).then(r => r.data),
    depositStatus: (id) => api.get('/deposit/status', { params: { id } }).then(r => r.data),
    depositCancel: (id) => api.get('/deposit/cancel', { params: { id } }).then(r => r.data),
    depositHistory: (limit = 20, status) => api.get('/deposit/history', { params: { limit, status } }).then(r => r.data),
    getServices: (server, country) => api.get('/services', { params: { server, country } }).then(r => r.data),
    getOperators: (server, country) => api.get('/operators', { params: { server, country } }).then(r => r.data),
    orderStatus: (id) => api.get('/status', { params: { id } }).then(r => r.data),
    orderCancel: (id) => api.get('/cancel', { params: { id } }).then(r => r.data),
    orderHistory: (limit = 20) => api.get('/history', { params: { limit } }).then(r => r.data),
    createOrder: ({ server, country, produk, operator, provider }) => {
        const params = { server, country, produk };
        if (operator) params.operator = operator;
        if (provider) params.provider = provider;
        return api.get('/order', { params }).then(r => r.data);
    }
};
