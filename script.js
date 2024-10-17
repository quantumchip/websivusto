class F1App {
    constructor() {
        this.sessionKey = 'latest';
        this.driverMap = {};
        this.resultsDetails = document.getElementById('results-details');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.topDrivers = document.getElementById('top-drivers');
        this.driverDetails = document.getElementById('driver-details');
        this.searchInput = document.getElementById('search-input');
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            if (this.resultsDetails) {
                this.fetchRecentRaceResults();
                setInterval(() => {
                    this.fetchRecentRaceResults();
                }, 60000); // 60000 ms = 1 minute
            }
            if (this.driverDetails) {
                this.fetchAllDriverData();
            }
            if (this.searchInput) {
                this.searchInput.addEventListener('input', () => this.filterDrivers());
            }
            
        });
    }

    fetchAllDriverData() {
        const driverNumbers = [1, 4, 16, 81, 55, 44, 63, 11, 14, 18, 27, 22, 23, 3, 10, 50, 20, 31, 43, 24, 2, 77];
        this.driverDetails.innerHTML = '';

        const fetchPromises = driverNumbers.map(driverNumber => 
            fetch(`https://api.openf1.org/v1/drivers?driver_number=${driverNumber}&session_key=${this.sessionKey}`)
                .then(response => response.json())
        );

        Promise.all(fetchPromises)
            .then(results => {
                const allDrivers = results.flat();
                allDrivers.sort((a, b) => a.driver_number - b.driver_number); // Sort by driver number

                this.renderDriverCards(allDrivers);

                // stores driver data for filtering
                this.allDrivers = allDrivers;
            })
            .catch(error => console.error('Error fetching driver data:', error));
    }

    renderDriverCards(driverData) {
        const driverHTML = driverData.map(driver => {
            const photoUrl = driver.headshot_url || 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png'; // Use default image if headshot_url is missing
            const fullName = driver.full_name || 'Unknown Driver';
            const teamName = driver.team_name || 'Unknown Team';
            const driverNumber = driver.driver_number || 'N/A';
            return `
                <div class="col-md-3">
                    <div class="card driverdata-card">
                        <img src="${photoUrl}" class="card-img-top driver-photo" alt="${fullName}">
                        <div class="card-body">
                            <h5 class="card-title">${fullName}</h5>
                            <p class="card-text">Team: ${teamName}</p>
                            <p class="card-text">Driver Number: ${driverNumber}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.driverDetails.innerHTML = driverHTML;

        // click event listener to each card
        document.querySelectorAll('.driverdata-card').forEach(card => {
            card.addEventListener('click', () => {
                const fullName = card.querySelector('.card-title').textContent;
                const teamName = card.querySelector('.card-text:nth-of-type(1)').textContent;
                const driverNumber = card.querySelector('.card-text:nth-of-type(2)').textContent;
                alert(`Driver: ${fullName}\n${teamName}\n${driverNumber}`);
            });
        });
    }

    filterDrivers() {
        const searchTerm = this.searchInput.value.toLowerCase();
        
        const filteredDrivers = this.allDrivers.filter(driver => 
            driver.team_name.toLowerCase().includes(searchTerm) ||
            driver.full_name.toLowerCase().includes(searchTerm) ||
            driver.driver_number.toString().includes(searchTerm)
        );
        
        this.renderDriverCards(filteredDrivers);
    }

    fetchRecentRaceResults() {
        this.showLoadingIndicator();
        this.fetchDrivers()
            .then(() => this.fetchRaceResults())
            .then(data => this.displayRaceResults(data))
            .then(() => this.fetchTopDrivers()) // Ensure this is called last
            .catch(error => this.handleError(error, 'race results'));
    }

    fetchDrivers() {
        return fetch('https://api.openf1.org/v1/drivers')
            .then(response => response.json())
            .then(driverData => {
                driverData.forEach(driver => {
                    this.driverMap[driver.driver_number] = {
                        fullName: driver.full_name,
                        photoUrl: driver.headshot_url
                    };
                });
                
            })
            .catch(error => this.handleError(error, 'driver data'));
    }

    fetchRaceResults() {
        return fetch(`https://api.openf1.org/v1/sessions?session_key=${this.sessionKey}`)
            .then(response => response.json());
    }

    displayRaceResults(data) {
        this.hideLoadingIndicator();
        this.resultsDetails.innerHTML = data.map(result => `
            <div class="result-item">
                <h5 class="card-title">Date: ${new Date(result.date_start).toLocaleDateString()}</h5>
                <p class="card-text">Session: ${result.session_name}</p>
                <p class="card-text">Country: ${result.country_name}</p>
                <p class="card-text">Circuit: ${result.circuit_short_name}</p>
                <p class="card-text">City: ${result.location}</p>
            </div>
        `).join('');
    }

    fetchTopDrivers() {
        return fetch('https://api.openf1.org/v1/position?meeting_key=latest')
            .then(response => response.json())
            .then(driverData => {
                
                const latestPositions = {};
                driverData.forEach(driver => {
                    if ([1, 2, 3].includes(driver.position)) {
                        if (!latestPositions[driver.position] || new Date(driver.date) > new Date(latestPositions[driver.position].date)) {
                            latestPositions[driver.position] = driver;
                        }
                    }
                });
                const topThreePositions = Object.values(latestPositions).sort((a, b) => a.position - b.position);
                this.topDrivers.innerHTML = topThreePositions.map(driver => `
                    <div class="card">
                        <img src="${this.driverMap[driver.driver_number]?.photoUrl || 'default.jpg'}" class="card-img-top" alt="${this.driverMap[driver.driver_number]?.fullName || 'Driver'}">
                        <div class="card-body">
                            <h5 class="card-title">${this.driverMap[driver.driver_number]?.fullName || 'N/A'}</h5>
                            <p class="card-text">Position: ${driver.position}</p>

                        </div>
                    </div>
                `).join('');
            })
            .catch(error => this.handleError(error, 'driver data'));
    }

    showLoadingIndicator() {
        this.loadingIndicator.style.display = 'block';
    }

    hideLoadingIndicator() {
        this.loadingIndicator.style.display = 'none';
    }

    handleError(error, context) {
        console.error(`Error fetching ${context}:`, error);
        this.hideLoadingIndicator();
        this.resultsDetails.innerHTML = `<div>Failed to load ${context}. Please refresh or try again later.</div>`;
    }
}

const f1App = new F1App();
f1App.init();
