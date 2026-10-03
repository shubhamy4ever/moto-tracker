const puppeteer = require('puppeteer');
const axios = require('axios');

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SKUs = [489, 490, 492, 494]; 

async function checkStock() {
    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    
    // Get the current minute to determine if this is the hourly run
    const currentMinute = new Date().getMinutes();
    // GitHub actions aren't perfectly on time; if it runs between XX:00 and XX:05, it counts as the top of the hour.
    const isHourlyRun = currentMinute >= 0 && currentMinute <= 5; 
    
    let allOutOfStock = true;

    try {
        const page = await browser.newPage();
        
        for (const sku of SKUs) {
            const url = `https://www.motorola.in/smartphones-motorola-edge-60-fusion/p?skuId=${sku}`;
            console.log(`Checking color SKU: ${sku}...`);
            
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            const isOutOfStock = await page.evaluate(() => {
                const outOfStockButton = document.querySelector('.let-me-know-click-handler');
                return outOfStockButton ? true : false;
            });

            if (!isOutOfStock) {
                // IT IS IN STOCK! Alert the group immediately!
                allOutOfStock = false;
                await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                    chat_id: CHAT_ID,
                    text: `🚨 URGENT: Moto Edge 60 Fusion (SKU: ${sku}) is IN STOCK! Buy here NOW: ${url}`
                });
            } else {
                console.log(`SKU ${sku} is still out of stock.`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // If nothing was in stock, AND this is the top-of-the-hour run, send the heartbeat report.
        if (allOutOfStock && isHourlyRun) {
            await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                chat_id: CHAT_ID,
                text: `🕒 Hourly Status Report: Checked all 4 colors. The Moto Edge 60 Fusion is currently OUT OF STOCK. Continuing to monitor...`
            });
        }

    } catch (error) {
        console.error("Tracking error:", error.message);
    } finally {
        await browser.close();
    }
}

checkStock();
