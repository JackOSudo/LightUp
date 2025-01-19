class LightsController {
    constructor() {
        this.apiUrl = 'http://192.168.0.139:5000';
        this.lights = {};
        this.userId = this.generateUserId();
        this.hasControl = false;
        this.inQueue = false;
        this.isServerConnected = false;
        this.setupEventListeners();
        this.startStatusCheck();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    setupEventListeners() {
        const controlPanel = document.querySelector('.control-panel');
        controlPanel.innerHTML = ''; // Clear existing controls

        // Add control request button
        const controlBtn = document.createElement('button');
        controlBtn.id = 'controlButton';
        controlBtn.textContent = 'Request Control';
        controlBtn.onclick = () => this.requestControl();
        
        const releaseBtn = document.createElement('button');
        releaseBtn.id = 'releaseButton';
        releaseBtn.textContent = 'Release Control';
        releaseBtn.style.display = 'none';
        releaseBtn.onclick = () => this.releaseControl();
        
        const leaveQueueBtn = document.createElement('button');
        leaveQueueBtn.id = 'leaveQueueButton';
        leaveQueueBtn.textContent = 'Leave Queue';
        leaveQueueBtn.style.display = 'none';
        leaveQueueBtn.onclick = () => this.leaveQueue();

        controlPanel.appendChild(controlBtn);
        controlPanel.appendChild(releaseBtn);
        controlPanel.appendChild(leaveQueueBtn);
        
        // Create light switches
        const lightGrid = document.createElement('div');
        lightGrid.className = 'light-grid';
        
        for (let i = 1; i <= 11; i++) {
            const lightSwitch = document.createElement('button');
            lightSwitch.id = `light-${i}`;
            lightSwitch.className = 'light-switch';
            lightSwitch.textContent = `Light ${i}`;
            lightSwitch.onclick = () => this.toggleLight(i);
            lightSwitch.disabled = true;
            lightGrid.appendChild(lightSwitch);
        }
        
        // Create song buttons
        const songControls = document.createElement('div');
        songControls.className = 'song-controls';
        
        const songs = ['song1', 'song2', 'song3'];
        songs.forEach(song => {
            const button = document.createElement('button');
            button.className = 'song-button';
            button.textContent = `Play ${song}`;
            button.onclick = () => this.playSong(song);
            button.disabled = true;
            songControls.appendChild(button);
        });

        controlPanel.appendChild(lightGrid);
        controlPanel.appendChild(songControls);
    }

    async requestControl() {
        try {
            const data = await this.makeRequest(`${this.apiUrl}/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    action: 'acquire'
                })
            });
            
            if (data.success) {
                this.hasControl = true;
                this.updateControlUI(true);
            } else {
                this.inQueue = true;
                alert(data.message);
                this.updateQueueUI(true);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async releaseControl() {
        try {
            const data = await this.makeRequest(`${this.apiUrl}/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    action: 'release'
                })
            });
            
            if (data.success) {
                this.hasControl = false;
                this.updateControlUI(false);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async leaveQueue() {
        try {
            const data = await this.makeRequest(`${this.apiUrl}/control`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    action: 'leave_queue'
                })
            });
            
            if (data.success) {
                this.inQueue = false;
                this.updateQueueUI(false);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async toggleLight(lightId) {
        if (!this.hasControl) return;
        
        try {
            const data = await this.makeRequest(`${this.apiUrl}/lights/${lightId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });
            
            if (data.success) {
                this.lights[lightId] = !this.lights[lightId];
                this.updateLightUI(lightId);
            } else {
                alert(data.message);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async playSong(songName) {
        if (!this.hasControl) return;
        
        try {
            const data = await this.makeRequest(`${this.apiUrl}/lights/play_song/${songName}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });
            
            alert(data.message);
        } catch (error) {
            this.handleError(error);
        }
    }

    updateControlUI(hasControl) {
        const controlBtn = document.getElementById('controlButton');
        const releaseBtn = document.getElementById('releaseButton');
        
        controlBtn.style.display = hasControl ? 'none' : 'block';
        releaseBtn.style.display = hasControl ? 'block' : 'none';
        
        // Enable/disable controls
        document.querySelectorAll('.light-switch, .song-button').forEach(button => {
            button.disabled = !hasControl;
        });
    }

    updateQueueUI(inQueue) {
        const leaveQueueBtn = document.getElementById('leaveQueueButton');
        leaveQueueBtn.style.display = inQueue ? 'block' : 'none';
    }

    updateLightUI(lightId) {
        const button = document.getElementById(`light-${lightId}`);
        if (button) {
            button.classList.toggle('active', this.lights[lightId]);
        }
    }

    handleError(error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }

    updateServerStatus(isConnected) {
        this.isServerConnected = isConnected;
        const statusElement = document.getElementById('connectionStatus');
        const controlPanel = document.querySelector('.control-panel');
        
        if (isConnected) {
            statusElement.textContent = 'Connected';
            statusElement.classList.remove('disconnected');
            controlPanel.classList.remove('disabled');
            document.getElementById('controlButton').disabled = false;
        } else {
            statusElement.textContent = 'Server Offline';
            statusElement.classList.add('disconnected');
            controlPanel.classList.add('disabled');
            // Disable all controls when server is down
            document.querySelectorAll('button').forEach(button => button.disabled = true);
            // Reset control states
            this.hasControl = false;
            this.inQueue = false;
            this.updateControlUI(false);
            this.updateQueueUI(false);
        }
    }

    async checkServerConnection() {
        try {
            // First try the root endpoint
            const rootResponse = await fetch(`${this.apiUrl}/`);
            if (!rootResponse.ok) {
                throw new Error('Server not responding');
            }

            // Then check health
            const healthResponse = await fetch(`${this.apiUrl}/health`);
            if (!healthResponse.ok) {
                const errorData = await healthResponse.json();
                throw new Error(errorData.error || 'Health check failed');
            }

            const healthData = await healthResponse.json();
            if (!healthData.gpio_available) {
                throw new Error('GPIO not available');
            }

            // If both checks pass, get status
            const statusResponse = await fetch(`${this.apiUrl}/status`);
            if (statusResponse.ok) {
                this.updateServerStatus(true);
                return await statusResponse.json();
            } else {
                throw new Error('Status check failed');
            }
        } catch (error) {
            this.updateServerStatus(false);
            console.error('Server connection failed:', error);
            const errorMsg = document.getElementById('errorMessage');
            errorMsg.textContent = `Server Error: ${error.message}`;
            errorMsg.classList.add('visible');
            return null;
        }
    }

    async checkStatus() {
        const status = await this.checkServerConnection();
        
        if (status) {
            // Update light states
            this.lights = status.lights;
            Object.entries(this.lights).forEach(([id, state]) => {
                const button = document.getElementById(`light-${id}`);
                if (button) {
                    button.classList.toggle('active', state);
                }
            });
            
            // Update control status
            if (status.current_user === this.userId) {
                this.hasControl = true;
                document.getElementById('connectionStatus').textContent = 
                    `You have control (${status.time_remaining}s remaining)`;
            } else if (status.queue.includes(this.userId)) {
                this.inQueue = true;
                const position = status.queue.indexOf(this.userId) + 1;
                document.getElementById('connectionStatus').textContent = 
                    `In queue (position ${position})`;
            } else {
                this.hasControl = false;
                this.inQueue = false;
                document.getElementById('connectionStatus').textContent = 
                    status.current_user ? 'Someone else has control' : 'Control available';
            }
            
            this.updateControlUI(this.hasControl);
            this.updateQueueUI(this.inQueue);
        }
    }

    async makeRequest(url, options = {}) {
        if (!this.isServerConnected) {
            throw new Error('Server is offline');
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Request failed');
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                this.updateServerStatus(false);
                throw new Error('Server request timed out');
            }
            throw error;
        }
    }

    startStatusCheck() {
        this.checkStatus()
        // Check status every second
        setInterval(() => this.checkStatus(), 10000);
    }
}

// Initialize the controller
const controller = new LightsController();

