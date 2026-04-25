// Dynamic API base URL no longer needed, using relative paths for Nginx proxy.

// Cookie Sync Engine
function getAppCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setAppCookie(name, value) {
    document.cookie = `${name}=${value}; max-age=86400; path=/`;
}

function removeAppCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

window.currentUser = getAppCookie('weatherSession');

function handleAppLogin(userid) {
    window.currentUser = userid;
    setAppCookie('weatherSession', userid);
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('weather-view').style.display = 'block';
}

function handleAppLogout() {
    window.currentUser = null;
    removeAppCookie('weatherSession');
    document.getElementById('weather-view').style.display = 'none';
    document.getElementById('login-view').style.display = 'flex';
}

setInterval(() => {
    const sessionCookie = getAppCookie('weatherSession');
    if (sessionCookie && !window.currentUser) {
        window.currentUser = sessionCookie;
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('weather-view').style.display = 'block';
    } else if (!sessionCookie && window.currentUser) {
        window.currentUser = null;
        document.getElementById('weather-view').style.display = 'none';
        document.getElementById('login-view').style.display = 'flex';
    }
}, 1000);

window.handleCredentialResponse = function(response) {
    // Decode the JWT token to get user profile
    const token = response.credential;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payloadInfo = JSON.parse(jsonPayload);
    
    console.log("Google Login Success! User info:", payloadInfo);
    handleAppLogin(payloadInfo.email);
};

document.addEventListener("DOMContentLoaded", () => {
    // Enforce initial view state on load
    if (window.currentUser) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('weather-view').style.display = 'block';
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            handleAppLogout();
        });
    }

    // Logic for ID/Password login using Fetch
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const userid = document.getElementById("userid").value.trim();
            const password = document.getElementById("password").value.trim();
            
            if (userid && password) {
                try {
                    // Try to login first
                    let response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userid, password: password })
                    });
                    
                    let data = await response.json();

                    if (response.status === 404 && data.error === 'User not found') {
                        // User doesn't exist, try to sign up
                        response = await fetch('/api/auth/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userid, password: password, name: userid.split('@')[0] })
                        });
                        data = await response.json();
                        
                        if (response.ok) {
                            alert(`New account created successfully! Welcome ${userid}!`);
                            handleAppLogin(userid);
                        } else {
                            alert(data.error || "Signup failed!");
                        }
                    } else if (response.ok) {
                        handleAppLogin(userid);
                    } else {
                        alert(data.error || "Login failed!");
                    }
                } catch (error) {
                    console.error("Authentication error:", error);
                    alert("Network error during authentication.");
                }
            }
        });
    }

    // Initialize map references to target only active weather elements, as `.city-input` has multiples now.
    const weatherView = document.getElementById("weather-view");
    const cityInput = weatherView.querySelector(".city-input");
    const searchButton = weatherView.querySelector(".search-btn");
    const apiKey = "0b4f0c71aa8b00b8125d5504c49c0b56";

    const notFoundsection = document.querySelector(".not-found");
    const searchCitySection = document.querySelector(".search-city-section");
    const weatherInfoSection = document.querySelector(".weather-info");
    const weatherSummaryImg = document.querySelector(".weather-summary-img");

    const countryTxt = document.querySelector(".country-txt");
    const tempTxt = document.querySelector(".temp-txt");
    const conditionTxt = document.querySelector(".condition-txt");
    const humidityValueTxt = document.querySelector(".humidity-value");
    const windValueTxt = document.querySelector(".wind-speed-value");
    const forecastContainer = document.querySelector(".forecast-items-container");

    searchButton.addEventListener("click", () => {
        const city = cityInput.value.trim();
        if (city) {
            updateWeatherInfo(city);
            cityInput.value = "";
            cityInput.blur();
        }
    });

    cityInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const city = cityInput.value.trim();
            if (city) {
                updateWeatherInfo(city);
                cityInput.value = "";
                cityInput.blur();
            }
        }
    });

    async function getFetchData(endPoint, city) {
        const apiUrl = `https://api.openweathermap.org/data/2.5/${endPoint}?q=${city}&appid=${apiKey}&units=metric`;
        const response = await fetch(apiUrl);
        return response.json();
    }

    function getWeatherIcon(id) {
        if (id >= 200 && id < 300) return "thunderstorm";
        if (id >= 300 && id < 500) return "drizzle";
        if (id >= 500 && id < 600) return "rain";
        if (id >= 600 && id < 700) return "snow";
        if (id >= 700 && id < 800) return "atmosphere";
        if (id === 800) return "clear";
        if (id > 800 && id < 900) return "clouds";
        return "unknown";
    }

    async function updateWeatherInfo(city) {
        try {
            const weatherData = await getFetchData("weather", city);
    
            if (!weatherData || weatherData.cod !== 200 || !weatherData.name || !weatherData.name.toLowerCase().includes(city.toLowerCase())) {
                showDisplaySection(notFoundsection);
                return;
            }

            // Successful search, update history
            if (window.currentUser) {
                try {
                    await fetch('/api/user/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: window.currentUser, city: city })
                    });
                } catch (err) {
                    console.error("Failed to update history:", err);
                }
            }
    
            const {
                name: cityName,
                sys: { country },
                main: { temp, humidity },
                weather: [{ id, main }],
                wind: { speed },
            } = weatherData;
    
            countryTxt.textContent = `${cityName}, ${country}`;
            tempTxt.textContent = Math.round(temp) + "°C";
            conditionTxt.textContent = main;
            humidityValueTxt.textContent = humidity + "%";
            windValueTxt.textContent = speed + " m/s";
    
            const iconName = getWeatherIcon(id);
            weatherSummaryImg.onerror = () => {
                weatherSummaryImg.src = "assets/weather/unknown.svg";
            };
            weatherSummaryImg.src = `assets/weather/${iconName}.svg`;
    
            await updateForecastsInfo(city);
            showDisplaySection(weatherInfoSection);
        } catch (error) {
            console.error("Error fetching weather data:", error);
            showDisplaySection(notFoundsection);
        }
    }
    

    async function updateForecastsInfo(city) {
        const forecastData = await getFetchData("forecast", city);

        const timeTaken = '12:00:00';
        const todayDate = new Date().toISOString().split('T')[0];

        // Clear previous forecasts
        forecastContainer.innerHTML = '';

        forecastData.list.forEach(forecastWeather => {
            if (forecastWeather.dt_txt.includes(timeTaken) && !forecastWeather.dt_txt.includes(todayDate)) {
                updateForecastItems(forecastWeather);
            }
        });
    }

    function updateForecastItems(weatherData) {
        const {
            dt_txt: dateStr,
            weather: [{ id }],
            main: { temp }
        } = weatherData;

        const date = new Date(dateStr);
        const options = { weekday: "short", day: "numeric", month: "short" };
        const formattedDate = date.toLocaleDateString(undefined, options);

        const forecastItem = `
            <div class="forecast-item">
                <h5 class="forecast-item-date regular-txt">${formattedDate}</h5>
                <img src="assets/weather/${getWeatherIcon(id)}.svg" class="forecast-item-img" alt="">
                <h5 class="forecast-item-temp">${Math.round(temp)}°C</h5>
            </div>`;

        forecastContainer.insertAdjacentHTML("beforeend", forecastItem);
    }

    function showDisplaySection(targetSection) {
        [weatherInfoSection, notFoundsection, searchCitySection].forEach(sec => {
            if (sec) sec.style.display = "none";
        });

        if (targetSection) targetSection.style.display = "flex";

        const searchCityInputContainer = document.querySelector(".search-city");
        if (searchCityInputContainer) searchCityInputContainer.style.display = "none";
    }
});
