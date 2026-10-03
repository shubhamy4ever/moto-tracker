const puppeteer = require('puppeteer');
const axios = require('axios');

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// The SKUs for the 4 different colors you mentioned
const SKUs = [489, 490, 492, 494]; 

async function checkStock() {
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    
    try {
        const page = await browser.newPage();
        
        // Loop through each color one by one
        for (const sku of SKUs) {
            const url = `https://www.motorola.in/smartphones-motorola-edge-60-fusion/p?skuId=${sku}`;
            console.log(`Checking color SKU: ${sku}...`);
            
            // Go to the page and wait for the network to finish loading
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            // Check the page for the specific Out of Stock button you found
            const isOutOfStock = await page.evaluate(() => {
                const outOfStockButton = document.querySelector('.let-me-know-click-handler');
                // If the button exists on the page, it is out of stock
                return outOfStockButton ? true : false;
            });

            if (!isOutOfStock) {
                // If the out of stock button is GONE, it must be in stock!
                await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                    chat_id: CHAT_ID,
                    text: `🚀 Moto Edge 60 Fusion (Color SKU: ${sku}) is IN STOCK! Buy here: ${url}`
                });
            } else {
                console.log(`Color SKU ${sku} is still out of stock.`);
            }
            
            // Wait 2 seconds before checking the next color so Motorola doesn't block the script
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) {
        console.error("Tracking error:", error.message);
    } finally {
        await browser.close();
    }
}

checkStock();
