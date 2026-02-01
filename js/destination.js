//Destination JavaScript File that will have all the required JS code for the destination page
console.log("This is the destination js file");

const cityInput = document.getElementById("cityInput");

const daysRange = document.getElementById("daysRange");
const daysText = document.getElementById("daysText");
const daysValue = document.getElementById("daysValue");

const budgetRange = document.getElementById("budgetRange");
const budgetText = document.getElementById("budgetText");
const budgetValue = document.getElementById("budgetValue");

const currencySelect = document.getElementById("currencySelect");
const genereateBtn = document.getElementById("generateBtn");

// format currency based on selected currency
const getCurrencySymbol = () => {
    const symbols = {'USD': '$', 'EUR': '€', 'GBP': '£' };
    return symbols[currencySelect.value] || '$';
};

// Update listners for UI sliders
daysRange.addEventListener("input", () => {
    const val = e.target.value;
    daysText.textContent = val;
    daysText.textContent = '${val} days'
});

budgetRange.addEventListener("input", (e) => {
    const val = parseInt(e.target.value).toLocaleString();
    const symbol = getCurrencySymbol();
    budgetValue.textContent = `${symbol}${val}`;
    budgetText.textContent = `Total budget: ${symbol}${val}`;
});

// Update currency symbols immediately if the dropdown changes
currencySelect.addEventListener("change", () => {
    // Trigger the budget range logic to update symbols
    budgetRange.dispatchEvent(new Event('input'));
});

// 4. Button Click Logic
discoverBtn.addEventListener("click", () => {
    const searchData = {
        city: cityInput.value || "Anywhere",
        duration: daysRange.value,
        budget: budgetRange.value,
        currency: currencySelect.value
    };

    console.log("Searching for adventures:", searchData);
    
    // Validation check
    if (!cityInput.value) {
        alert("Please enter a destination city to start your adventure!");
        return;
    }

    alert(`Searching for the best spots in ${searchData.city} for ${searchData.duration} days! Check the console for data.`);
});




