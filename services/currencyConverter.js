async function convertCurrency(amount, fromCurrency, toCurrency) {
    const apiKey = 'your_api_key';
    const url = `https://open.er-api.com/v6/latest/${fromCurrency}`;

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url);
        const data = await response.json();
        const rate = data.rates[toCurrency];

        if (!rate) {
            throw new Error(`Unable to get conversion rate from ${fromCurrency} to ${toCurrency}`);
        }

        return (amount * rate).toFixed(2); 
    } catch (error) {
        console.error("Error fetching conversion rate:", error);
        throw new Error('Currency conversion failed');
    }
}

module.exports = { convertCurrency };
