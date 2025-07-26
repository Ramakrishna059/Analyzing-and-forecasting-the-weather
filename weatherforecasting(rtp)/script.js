const cityInput = document.querySelector(".city-input");
const searchButton = document.querySelector(".search-btn");
const locationButton = document.querySelector(".location-btn");
const currentWeatherDiv = document.querySelector(".current-weather");
const weatherCardsDiv = document.querySelector(".weather-cards");

// IMPORTANT: Replace "YOUR_API_KEY_HERE" with your actual OpenWeatherMap API key.
// Make sure it's active and correctly copied from your OpenWeatherMap account.
// New API keys can take a few minutes (or sometimes hours) to become active.
const API_KEY = "cc37eb3fe42f6ac2981f348d707ae6b7"; // Your provided API key

const createWeatherCard = (cityName, weatherItem, index) => {
    // Extract the date part from dt_txt (e.g., "2025-07-24")
    const date = weatherItem.dt_txt.split(" ")[0];

    // Convert Kelvin to Celsius and fix to 2 decimal places
    const temperatureCelsius = (weatherItem.main.temp - 273.15).toFixed(2);

    if(index === 0) { // HTML for the main current weather card
        return `<div class="details">
                    <h2>${cityName} (${date})</h2>
                    <h6>Temperature: ${temperatureCelsius}°C</h6>
                    <h6>Wind: ${weatherItem.wind.speed} M/S</h6>
                    <h6>Humidity: ${weatherItem.main.humidity}%</h6>
                </div>
                <div class="icon">
                    <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@4x.png" alt="weather-icon">
                    <h6>${weatherItem.weather[0].description}</h6>
                </div>`;
    } else { // HTML for the other five-day forecast cards
        return `<li class="card">
                    <h3>(${date})</h3>
                    <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@4x.png" alt="weather-icon">
                    <h6>Temp: ${temperatureCelsius}°C</h6>
                    <h6>Wind: ${weatherItem.wind.speed} M/S</h6>
                    <h6>Humidity: ${weatherItem.main.humidity}%</h6>
                </li>`;
    }
}

const getWeatherDetails = (cityName, latitude, longitude) => {
    // OpenWeatherMap 5-day / 3-hour forecast API URL
    const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}`;

    fetch(WEATHER_API_URL)
        .then(response => {
            // Check if the HTTP response was successful (status code 200-299)
            if (!response.ok) {
                // If not successful, throw an error to be caught by the .catch() block
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            return response.json(); // Parse the JSON response
        })
        .then(data => {
            if (!data.list || data.list.length === 0) {
                currentWeatherDiv.innerHTML = "<p>No weather data found for this location.</p>";
                weatherCardsDiv.innerHTML = "";
                return;
            }

            // Clearing previous weather data
            cityInput.value = "";
            currentWeatherDiv.innerHTML = "";
            weatherCardsDiv.innerHTML = "";

            // --- Display Current Weather ---
            // The first item in data.list is usually the most current
            const currentWeatherData = data.list[0];
            currentWeatherDiv.insertAdjacentHTML("beforeend", createWeatherCard(cityName, currentWeatherData, 0));

            // --- Display 5-Day Forecast ---
            const fiveDaysForecastCards = [];
            const seenDates = new Set();
            const todayDate = new Date().getDate(); // Get current day of the month

            for (const forecast of data.list) {
                const forecastDateObj = new Date(forecast.dt_txt);
                const forecastDay = forecastDateObj.getDate();
                const forecastHour = forecastDateObj.getHours();

                // Skip entries for the current day for the 5-day forecast cards
                if (forecastDay === todayDate) {
                    continue;
                }

                const dateString = forecastDateObj.toDateString(); // E.g., "Fri Jul 25 2025"

                // We want to pick one representative entry per day for the next 5 days.
                // Prioritize entries around 12 PM (noon) or 3 PM for daily summary.
                if (!seenDates.has(dateString)) {
                    if (forecastHour >= 11 && forecastHour <= 15) { // Check for 11 AM, 12 PM, 1 PM, 2 PM, 3 PM
                        fiveDaysForecastCards.push(forecast);
                        seenDates.add(dateString);
                    } else if (fiveDaysForecastCards.filter(f => new Date(f.dt_txt).toDateString() === dateString).length === 0) {
                        // If no "midday" forecast is found for this day yet, take the first one encountered for that day
                        // This ensures we still get a forecast for the day if 12/15 PM is missing
                        fiveDaysForecastCards.push(forecast);
                        seenDates.add(dateString);
                    }
                }

                if (fiveDaysForecastCards.length >= 5) {
                    break; // We have enough cards for the next 5 days
                }
            }

            // Sort the 5-day forecast cards by date to ensure correct order
            fiveDaysForecastCards.sort((a, b) => new Date(a.dt_txt) - new Date(b.dt_txt));

            if (fiveDaysForecastCards.length > 0) {
                fiveDaysForecastCards.forEach(weatherItem => {
                    weatherCardsDiv.insertAdjacentHTML("beforeend", createWeatherCard(cityName, weatherItem, 1));
                });
            } else {
                weatherCardsDiv.innerHTML = "<p>No 5-day forecast data available.</p>";
            }

        })
        .catch(error => {
            console.error("Error fetching weather forecast:", error); // Log the actual error for detailed debugging
            alert("An error occurred while fetching the weather forecast! Please check your city name, API key, or network connection.");
        });
}

const getCityCoordinates = () => {
    const cityName = cityInput.value.trim();
    if (cityName === "") {
        alert("Please enter a city name."); // User feedback for empty input
        return;
    }

    // OpenWeatherMap Geocoding API URL to get coordinates from city name
    const GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;

    fetch(GEOCODING_API_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.length) {
                alert(`No coordinates found for "${cityName}". Please check the spelling or try a different city.`);
                return;
            }
            // Destructure latitude, longitude, and name from the first result
            const { lat, lon, name } = data[0];
            getWeatherDetails(name, lat, lon); // Call function to get weather details with coordinates
        })
        .catch(error => {
            console.error("Error fetching city coordinates:", error); // Log the actual error
            alert("An error occurred while fetching the city coordinates! Please try again.");
        });
}

const getUserCoordinates = () => {
    // Check if the browser supports Geolocation API
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser. Please enter a city name manually.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords; // Get coordinates of user location

            // OpenWeatherMap Reverse Geocoding API URL to get city name from coordinates
            const REVERSE_GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;

            fetch(REVERSE_GEOCODING_API_URL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.length) {
                        alert("Could not determine city name from your location coordinates.");
                        return;
                    }
                    const { name } = data[0]; // Get city name from the first result
                    getWeatherDetails(name, latitude, longitude); // Get weather details using the found city name and coordinates
                })
                .catch(error => {
                    console.error("Error fetching city name from coordinates:", error); // Log the actual error
                    alert("An error occurred while fetching the city name from your location. Please ensure location services are enabled.");
                });
        },
        error => { // Callback for when geolocation fails or permission is denied
            if (error.code === error.PERMISSION_DENIED) {
                alert("Geolocation request denied. Please allow location access in your browser settings to use this feature.");
            } else {
                alert(`Geolocation request error: ${error.message}. Please try again or enter a city manually.`);
            }
            console.error("Geolocation error:", error); // Log the actual geolocation error
        }
    );
}

// Event Listeners for buttons and input field
locationButton.addEventListener("click", getUserCoordinates);
searchButton.addEventListener("click", getCityCoordinates);
cityInput.addEventListener("keyup", e => e.key === "Enter" && getCityCoordinates());