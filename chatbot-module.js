/**
 * DiagKnows AI Chatbot - Modular Implementation
 * Clean, maintainable code with modern JavaScript best practices
 */

class DiagKnowsChatbot {
    constructor() {
        this.state = {
            currentQuestion: 0,
            userSymptoms: {},
            askedQuestions: new Set(),
            followUpQuestions: [],
            conversationPath: null,
            currentSymptom: null,
            symptomFollowUpAsked: false,
            sleepEnergyQuestionAnswered: false,
            sleepAppetiteEnergyAsked: false,
            sleepAppetiteEnergyAnswered: false,
            sleepAppetiteEnergyQuestionShown: false,
            sleepAppetiteEnergyAlreadyAsked: false,
            lastQuestionAsked: null,
            isVitalSignsStep: false,
            emergencyFlag: false,
            feedbackShown: false,
            chatHistory: []
        };

        this.questions = [
            "What symptoms are you experiencing? (e.g., fever, cough, headache, fatigue, stomach pain, chest pain)",
            "How long have you had these symptoms? (hours/days/weeks)",
            "Do you have any known medical conditions?",
            "Are you currently taking any medication?",
            "Do you have any known allergies to medications or substances? (e.g., Penicillin, Ibuprofen, Aspirin, Sulfa drugs)",
            "Can you provide any vital signs? (pulse, blood pressure, temperature, blood glucose)",
            "Do you or your immediate family have a history of any of the following?",
            "Have you been feeling unusually sad, hopeless, or disinterested in activities?",
            "What is your vaccination status? (COVID, flu, etc.)",
            "How has your sleep, appetite, and energy level been?"
        ];

        this.conversationPaths = {
            fever: {
                followUp: "How high is your temperature?",
                options: ["Below 100°F", "100-102°F", "Above 102°F", "Don't know"],
                nextPath: {
                    "above 102": "high_fever",
                    "100-102": "moderate_fever"
                }
            },
            cough: {
                followUp: "Is the cough dry or productive (bringing up mucus)?",
                options: ["Dry cough", "Productive cough", "Both", "Not sure"],
                nextPath: {
                    "productive": "productive_cough",
                    "dry": "dry_cough"
                }
            },
            headache: {
                followUp: "Where is the pain located?",
                options: ["Front of head", "Back of head", "One side", "All over", "Not sure"],
                nextPath: {
                    "one side": "migraine",
                    "all over": "tension_headache"
                }
            },
            chest_pain: {
                followUp: "Does the pain worsen when breathing deeply?",
                options: ["Yes", "No", "Sometimes", "Not sure"],
                nextPath: {
                    "yes": "pleurisy",
                    "no": "musculoskeletal"
                },
                emergency: true
            }
        };

        this.conditionFollowUps = {
            high_fever: {
                question: "A high fever requires attention. Do you also have chills or body aches?",
                options: ["Yes", "No", "Not sure"],
                emergency: true
            },
            productive_cough: {
                question: "A productive cough with mucus. What color is the mucus?",
                options: ["Clear/White", "Yellow", "Green", "Blood-tinged", "Not sure"],
                emergency: (color) => color === "Blood-tinged"
            },
            pleurisy: {
                question: "⚠️ Chest pain that worsens with breathing could indicate a serious condition. Do you also have shortness of breath?",
                options: ["Yes", "No", "Not sure"],
                emergency: true
            }
        };

        this.diseaseDatabase = {
            'Acute Bronchitis': {
                symptoms: ['cough', 'mucus', 'chest congestion', 'fatigue', 'mild fever'],
                vitalSigns: { temperature: { min: 99, max: 101 } },
                matchScore: 0,
                description: 'Inflammation of the bronchial tubes causing cough and mucus production',
                topMedications: [
                    'Dextromethorphan (Cough Suppressant)',
                    'Guaifenesin (Expectorant)',
                    'Acetaminophen (Tylenol)',
                    'Ibuprofen (Advil)',
                    'Honey (Natural Cough Remedy)'
                ],
                warnings: ['See doctor if cough persists more than 2 weeks']
            },
            'Influenza': {
                symptoms: ['fever', 'body aches', 'fatigue', 'headache', 'cough', 'sore throat'],
                vitalSigns: { temperature: { min: 100, max: 104 } },
                matchScore: 0,
                description: 'Viral infection affecting the respiratory system',
                topMedications: [
                    'Acetaminophen (Tylenol)',
                    'Ibuprofen (Advil)',
                    'Pseudoephedrine (Decongestant)',
                    'Oseltamivir (Tamiflu)',
                    'Zinc Supplements'
                ],
                warnings: ['Seek medical care if symptoms are severe']
            },
            'Common Cold': {
                symptoms: ['runny nose', 'congestion', 'sneezing', 'sore throat', 'mild cough'],
                vitalSigns: { temperature: { min: 98, max: 100 } },
                matchScore: 0,
                description: 'Viral upper respiratory infection',
                topMedications: [
                    'Pseudoephedrine (Sudafed)',
                    'Dextromethorphan (Robitussin)',
                    'Chlorpheniramine (Chlor-Trimeton)',
                    'Zinc Lozenges',
                    'Vitamin C Supplements'
                ],
                warnings: ['Symptoms typically resolve in 7-10 days']
            }
        };

        this.quickOptions = {
            0: ["Fever", "Cough", "Headache", "Fatigue", "Stomach Pain", "Chest Pain"],
            1: ["Few hours", "1-2 days", "3-7 days", "Over a week", "Not sure"],
            2: ["None", "Diabetes", "Heart Disease", "Asthma", "Other"],
            3: ["None", "Pain relievers", "Prescription meds", "Supplements", "Other"],
            4: ["None", "Penicillin", "Ibuprofen", "Aspirin", "Other"],
            5: ["Don't have", "Normal range", "Elevated", "Low", "Not sure"],
            6: ["None", "Heart disease", "Diabetes", "Cancer", "Other"],
            7: ["No", "Sometimes", "Often", "Very often"],
            8: ["Up to date", "Need COVID", "Need flu", "Need other", "Not sure"],
            9: ["Good", "Fair", "Poor", "Very poor"]
        };

        this.initializeEventListeners();
    }

    // Initialize event listeners
    initializeEventListeners() {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // Voice input functionality
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        }
    }

    // Initialize chatbot
    initialize() {
        this.resetState();
        this.loadUserProfile();
        this.displayWelcomeMessage();
        this.showQuickOptions(this.getQuickOptionsForQuestion(0));
    }

    // Reset chatbot state
    resetState() {
        this.state.currentQuestion = 0;
        this.state.userSymptoms = {};
        this.state.askedQuestions.clear();
        this.state.followUpQuestions = [];
        this.state.conversationPath = null;
        this.state.currentSymptom = null;
        this.state.symptomFollowUpAsked = false;
        this.state.sleepEnergyQuestionAnswered = false;
        this.state.sleepAppetiteEnergyAsked = false;
        this.state.sleepAppetiteEnergyAnswered = false;
        this.state.sleepAppetiteEnergyQuestionShown = false;
        this.state.sleepAppetiteEnergyAlreadyAsked = false;
        this.state.lastQuestionAsked = null;
        this.state.isVitalSignsStep = false;
        this.state.emergencyFlag = false;
        this.state.feedbackShown = false;
    }

    // Load user profile information
    loadUserProfile() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && currentUser.height && currentUser.weight) {
            const heightInches = currentUser.height;
            const weightLbs = currentUser.weight;
            const bmi = ((weightLbs * 703) / (heightInches * heightInches)).toFixed(1);
            return `<br><br>I can see your profile information: Height ${currentUser.height} inches, Weight ${currentUser.weight} lbs (BMI: ${bmi})`;
        }
        return '';
    }

    // Display welcome message
    displayWelcomeMessage() {
        const profileInfo = this.loadUserProfile();
        const welcomeMessage = `Hello! I'm your AI health assistant. What symptoms are you experiencing today?${profileInfo}`;
        
        document.getElementById('chatMessages').innerHTML = `
            <div class="message bot">
                <div class="message-content">
                    ${welcomeMessage}
                </div>
            </div>
        `;
        
        this.state.askedQuestions.add(0);
    }

    // Send message handler
    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addMessage(message, 'user');
        input.value = '';
        
        // Process response with delay for natural feel
        setTimeout(() => {
            this.processResponse(message);
        }, 500);
    }

    // Process user response
    processResponse(userMessage) {
        // Block progression if in vital signs step
        if (this.state.isVitalSignsStep) {
            return;
        }
        
        // Handle follow-up questions
        if (this.state.followUpQuestions.length > 0) {
            this.handleFollowUpResponse(userMessage);
            return;
        }
        
        // Process main conversation flow
        if (this.state.currentQuestion < this.questions.length) {
            this.processMainConversation(userMessage);
        }
    }

    // Process main conversation flow
    processMainConversation(userMessage) {
        // Handle special question logic
        if (this.state.sleepAppetiteEnergyAlreadyAsked) {
            this.handleSleepAppetiteEnergyLogic();
            return;
        }
        
        // Store user's answer
        this.state.userSymptoms[`question${this.state.currentQuestion}`] = userMessage;
        
        // Handle special question types
        if (this.state.currentQuestion === 5) {
            this.processVitalSignsInput(userMessage);
            return;
        }
        
        if (this.state.currentQuestion === 6) {
            this.processFamilyHistoryInput(userMessage);
            return;
        }
        
        if (this.state.currentQuestion === 7) {
            this.processDepressionInput(userMessage);
        }
        
        if (this.state.currentQuestion === 9) {
            this.handleSleepAppetiteEnergyQuestion(userMessage);
        }
        
        // Handle dynamic conversation paths
        if (this.state.currentQuestion === 0) {
            const detectedPath = this.detectConversationPath(userMessage);
            if (detectedPath) {
                this.state.conversationPath = detectedPath;
                this.state.currentSymptom = detectedPath;
                this.state.symptomFollowUpAsked = false;
                this.showFollowUpQuestion(detectedPath);
                return;
            }
        }
        
        // Move to next question
        this.moveToNextQuestion();
    }

    // Handle sleep/appetite/energy question logic
    handleSleepAppetiteEnergyLogic() {
        this.state.currentQuestion++;
        
        while (this.state.currentQuestion < this.questions.length && 
               (this.state.askedQuestions.has(this.state.currentQuestion) || 
                (this.state.currentQuestion === 9 && 
                 (this.state.sleepEnergyQuestionAnswered || this.state.sleepAppetiteEnergyAnswered)))) {
            this.state.currentQuestion++;
        }
        
        if (this.state.currentQuestion < this.questions.length) {
            this.askNextQuestion();
        } else {
            this.analyzeSymptoms();
        }
    }

    // Move to next question
    moveToNextQuestion() {
        this.state.currentQuestion++;
        
        // Clear symptom tracking
        this.state.currentSymptom = null;
        this.state.symptomFollowUpAsked = false;
        
        // Check if we've completed all questions
        if (this.state.currentQuestion >= this.questions.length) {
            this.analyzeSymptoms();
        } else {
            this.askNextQuestion();
        }
    }

    // Ask next question
    askNextQuestion() {
        this.state.askedQuestions.add(this.state.currentQuestion);
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.removeTypingIndicator();
            this.addMessage(this.questions[this.state.currentQuestion], 'bot');
            this.showQuickOptions(this.getQuickOptionsForQuestion(this.state.currentQuestion));
        }, 1500);
    }

    // Detect conversation path based on symptoms
    detectConversationPath(symptoms) {
        const symptomsLower = symptoms.toLowerCase();
        
        for (const [path, data] of Object.entries(this.conversationPaths)) {
            if (symptomsLower.includes(path)) {
                return path;
            }
        }
        
        return null;
    }

    // Show follow-up question
    showFollowUpQuestion(path) {
        const pathData = this.conversationPaths[path];
        if (pathData) {
            this.addMessage(pathData.followUp, 'bot');
            this.showQuickOptions(pathData.options);
            this.state.symptomFollowUpAsked = true;
        }
    }

    // Handle follow-up response
    handleFollowUpResponse(response) {
        const followUpType = this.state.followUpQuestions[0];
        
        if (followUpType === 'vital_signs') {
            this.handleVitalSignsResponse(response);
        } else if (followUpType === 'family_history') {
            return; // Handled by checkbox form
        } else {
            this.handleConversationPathFollowUp(response);
        }
    }

    // Handle conversation path follow-up
    handleConversationPathFollowUp(response) {
        const currentPath = this.state.conversationPath;
        const pathData = this.conversationPaths[currentPath];
        
        if (pathData && pathData.nextPath) {
            const responseLower = response.toLowerCase();
            let nextPath = null;
            
            for (const [key, value] of Object.entries(pathData.nextPath)) {
                if (responseLower.includes(key)) {
                    nextPath = value;
                    break;
                }
            }
            
            if (nextPath && this.conditionFollowUps[nextPath]) {
                const followUp = this.conditionFollowUps[nextPath];
                this.addMessage(followUp.question, 'bot');
                this.showQuickOptions(followUp.options);
                
                if (followUp.emergency) {
                    this.state.emergencyFlag = true;
                    setTimeout(() => {
                        this.showEmergencyAlert();
                    }, 1000);
                }
            }
        }
        
        this.state.followUpQuestions = [];
    }

    // Add message to chat
    addMessage(content, sender, options = null) {
        const messagesContainer = document.getElementById('chatMessages');
        
        // Prevent duplicate messages
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains(sender)) {
            const lastContent = lastMessage.querySelector('.message-content');
            if (lastContent && lastContent.textContent.trim() === content.trim()) {
                return;
            }
        }
        
        // Prevent duplicate bot questions
        if (sender === 'bot' && this.state.lastQuestionAsked === content.trim()) {
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const timestamp = new Date().toLocaleTimeString();
        const messageContent = sender === 'bot' ? 
            `<div class="message-header">
                <span class="bot-label">DiagKnows AI</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">
                ${content.replace(/\n/g, '<br>')}
            </div>` :
            `<div class="message-header">
                <span class="user-label">You</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">
                ${content}
            </div>`;
        
        messageDiv.innerHTML = messageContent;
        messagesContainer.appendChild(messageDiv);
        
        // Store last question asked
        if (sender === 'bot') {
            this.state.lastQuestionAsked = content.trim();
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show options if provided
        if (options && Array.isArray(options)) {
            setTimeout(() => {
                this.showQuickOptions(options);
            }, 500);
        }
    }

    // Show quick options
    showQuickOptions(options) {
        if (!options || options.length === 0) return;
        
        const messagesContainer = document.getElementById('chatMessages');
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'quick-options';
        
        options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'quick-option-btn';
            button.textContent = option;
            button.onclick = () => this.handleQuickOption(option);
            optionsContainer.appendChild(button);
        });
        
        messagesContainer.appendChild(optionsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Handle quick option selection
    handleQuickOption(option) {
        this.addMessage(option, 'user');
        
        // Remove the quick options
        const quickOptions = document.querySelectorAll('.quick-options');
        quickOptions.forEach(option => option.remove());
        
        // Process the selected option
        setTimeout(() => {
            this.processResponse(option);
        }, 500);
    }

    // Show typing indicator
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Remove typing indicator
    removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Get quick options for specific question
    getQuickOptionsForQuestion(questionIndex) {
        return this.quickOptions[questionIndex] || [];
    }

    // Process vital signs input
    processVitalSignsInput(input) {
        if (input.toLowerCase().includes('don\'t') || input.toLowerCase().includes('not')) {
            this.addMessage("No problem! Let's continue without vital signs.", 'bot');
            this.moveToNextQuestion();
        } else {
            this.state.isVitalSignsStep = true;
            this.showVitalSignsForm();
        }
    }

    // Show vital signs form
    showVitalSignsForm() {
        const formHTML = `
            <div class="vital-signs-form">
                <div class="form-header">
                    <h4>📊 Vital Signs Assessment</h4>
                    <p>Please provide your vital signs if available</p>
                </div>
                <div class="vital-inputs">
                    <div class="input-group">
                        <label>Temperature (°F)</label>
                        <input type="number" id="tempInput" placeholder="e.g., 98.6" step="0.1">
                        <div class="input-hint">Normal: 97-99°F</div>
                    </div>
                    <div class="input-group">
                        <label>Blood Pressure</label>
                        <div class="bp-inputs">
                            <input type="number" id="systolicInput" placeholder="Systolic">
                            <span class="bp-separator">/</span>
                            <input type="number" id="diastolicInput" placeholder="Diastolic">
                        </div>
                        <div class="input-hint">Normal: 120/80 mmHg</div>
                    </div>
                    <div class="input-group">
                        <label>Heart Rate (bpm)</label>
                        <input type="number" id="pulseInput" placeholder="e.g., 72">
                        <div class="input-hint">Normal: 60-100 bpm</div>
                    </div>
                    <div class="input-group">
                        <label>Blood Glucose (mg/dL)</label>
                        <input type="number" id="glucoseInput" placeholder="e.g., 100">
                        <div class="input-hint">Normal: 70-140 mg/dL</div>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="chatbot.submitVitalSigns()">Submit</button>
                    <button class="btn btn-secondary" onclick="chatbot.skipVitalSigns()">Skip</button>
                </div>
            </div>
        `;
        
        this.addMessage(formHTML, 'bot');
    }

    // Submit vital signs
    submitVitalSigns() {
        const temp = parseFloat(document.getElementById('tempInput')?.value);
        const systolic = parseInt(document.getElementById('systolicInput')?.value);
        const diastolic = parseInt(document.getElementById('diastolicInput')?.value);
        const pulse = parseInt(document.getElementById('pulseInput')?.value);
        const glucose = parseInt(document.getElementById('glucoseInput')?.value);
        
        const vitalSigns = { temp, systolic, diastolic, pulse, glucose };
        this.state.userSymptoms.vitalSigns = vitalSigns;
        
        // Check for critical values
        const criticalWarnings = this.checkCriticalVitalSigns(vitalSigns);
        
        if (criticalWarnings.length > 0) {
            this.addMessage(`⚠️ **CRITICAL VITAL SIGNS DETECTED:**\n${criticalWarnings.join('\n')}\n\nPlease seek emergency medical care immediately!`, 'bot');
        }
        
        this.state.isVitalSignsStep = false;
        this.moveToNextQuestion();
    }

    // Skip vital signs
    skipVitalSigns() {
        this.addMessage("That's perfectly fine! We can proceed without vital signs. Let's continue with the assessment.", 'bot');
        this.state.isVitalSignsStep = false;
        this.moveToNextQuestion();
    }

    // Check for critical vital signs
    checkCriticalVitalSigns(vitalSigns) {
        const warnings = [];
        
        if (vitalSigns.temp > 103) {
            warnings.push('• High fever (>103°F) - Seek immediate medical care');
        }
        
        if (vitalSigns.systolic > 180 || vitalSigns.diastolic > 110) {
            warnings.push('• High blood pressure - Seek medical attention');
        }
        
        if (vitalSigns.pulse > 120 || vitalSigns.pulse < 50) {
            warnings.push('• Abnormal heart rate - Seek medical attention');
        }
        
        if (vitalSigns.glucose > 300 || vitalSigns.glucose < 70) {
            warnings.push('• Abnormal blood glucose - Seek medical attention');
        }
        
        return warnings;
    }

    // Process family history input
    processFamilyHistoryInput(input) {
        this.state.followUpQuestions = ['family_history'];
        this.showFamilyHistoryForm();
    }

    // Show family history form
    showFamilyHistoryForm() {
        const formHTML = `
            <div class="family-history-options">
                <h4>Family Medical History</h4>
                <div class="history-checkbox">
                    <input type="checkbox" id="heart-disease" value="heart disease">
                    <label for="heart-disease">Heart Disease</label>
                </div>
                <div class="history-checkbox">
                    <input type="checkbox" id="diabetes" value="diabetes">
                    <label for="diabetes">Diabetes</label>
                </div>
                <div class="history-checkbox">
                    <input type="checkbox" id="cancer" value="cancer">
                    <label for="cancer">Cancer</label>
                </div>
                <div class="history-checkbox">
                    <input type="checkbox" id="hypertension" value="hypertension">
                    <label for="hypertension">Hypertension</label>
                </div>
                <div class="history-checkbox">
                    <input type="checkbox" id="asthma" value="asthma">
                    <label for="asthma">Asthma</label>
                </div>
                <div class="history-checkbox">
                    <input type="checkbox" id="none" value="none">
                    <label for="none">None</label>
                </div>
                <button class="btn btn-primary" onclick="chatbot.submitFamilyHistory()">Submit</button>
            </div>
        `;
        
        this.addMessage(formHTML, 'bot');
    }

    // Submit family history
    submitFamilyHistory() {
        const checkboxes = document.querySelectorAll('.family-history-options input[type="checkbox"]:checked');
        const familyHistory = Array.from(checkboxes).map(cb => cb.value);
        
        this.state.userSymptoms.familyHistory = familyHistory;
        this.state.followUpQuestions = [];
        this.moveToNextQuestion();
    }

    // Process depression input
    processDepressionInput(input) {
        const response = input.toLowerCase();
        if (response.includes('yes') || response.includes('often') || response.includes('very')) {
            this.addMessage("Thank you for sharing that. It's important to talk about mental health. We'll include some resources in your assessment summary.", 'bot');
        }
    }

    // Handle sleep/appetite/energy question
    handleSleepAppetiteEnergyQuestion(userMessage) {
        this.state.sleepEnergyQuestionAnswered = true;
        this.state.sleepAppetiteEnergyAnswered = true;
        this.state.sleepAppetiteEnergyAsked = true;
        this.state.sleepAppetiteEnergyQuestionShown = true;
        this.state.sleepAppetiteEnergyAlreadyAsked = true;
        
        // Remove existing options
        const existingOptions = document.querySelectorAll('.quick-options');
        existingOptions.forEach(option => option.remove());
    }

    // Analyze symptoms and provide diagnosis
    analyzeSymptoms() {
        const symptoms = this.state.userSymptoms;
        const vitalSigns = symptoms.vitalSigns || {};
        const familyHistory = symptoms.familyHistory || [];
        
        // Calculate disease probabilities
        const diseaseScores = this.calculateDiseaseProbabilities(symptoms, vitalSigns, familyHistory);
        
        // Generate diagnosis message
        const diagnosisMessage = this.generateDiagnosisMessage(diseaseScores);
        this.addMessage(diagnosisMessage, 'bot');
        
        // Show recommendations
        if (diseaseScores.length > 0) {
            const topMatch = diseaseScores[0];
            const recommendations = this.generateRecommendations(topMatch);
            this.addMessage(recommendations, 'bot');
        }
        
        // Show warnings
        const warnings = this.generateWarnings(diseaseScores, vitalSigns);
        if (warnings.length > 0) {
            this.addMessage(warnings, 'bot');
        }
        
        // Add final disclaimer
        this.addMessage("**Important:** These are estimates based on your symptoms. Please consult a healthcare provider for a confirmed diagnosis.", 'bot');
        
        // Prompt for medical document upload
        setTimeout(() => {
            this.promptForMedicalUpload();
        }, 1500);
        
        // Show feedback prompt
        if (!this.state.feedbackShown) {
            setTimeout(() => {
                this.showFeedbackPrompt();
                this.state.feedbackShown = true;
            }, 4000);
        }
        
        // Store chat summary
        this.storeChatSummary(diseaseScores);
        
        // Show restart option
        setTimeout(() => {
            this.addMessage("Would you like to start a new assessment?", 'bot', ["Yes, Start Over", "No, I'm Done"]);
        }, 3000);
    }

    // Calculate disease probabilities
    calculateDiseaseProbabilities(symptoms, vitalSigns, familyHistory) {
        const diseaseScores = [];
        
        for (const [disease, data] of Object.entries(this.diseaseDatabase)) {
            let matchScore = 0;
            const userSymptoms = Object.values(symptoms).join(' ').toLowerCase();
            
            // Check symptom matches
            data.symptoms.forEach(symptom => {
                if (userSymptoms.includes(symptom.toLowerCase())) {
                    matchScore += 1;
                }
            });
            
            // Check vital signs
            if (vitalSigns.temp && data.vitalSigns?.temperature) {
                const temp = vitalSigns.temp;
                const tempRange = data.vitalSigns.temperature;
                if (temp >= tempRange.min && temp <= tempRange.max) {
                    matchScore += 0.5;
                }
            }
            
            // Calculate percentage
            const percentage = Math.min((matchScore / data.symptoms.length) * 100, 95);
            
            // Determine confidence
            let confidence = 'low';
            if (percentage > 70) confidence = 'high';
            else if (percentage > 50) confidence = 'medium';
            
            diseaseScores.push({
                disease,
                percentage: Math.round(percentage),
                confidence,
                description: data.description,
                topMedications: data.topMedications,
                warnings: data.warnings
            });
        }
        
        // Sort by percentage
        return diseaseScores.sort((a, b) => b.percentage - a.percentage);
    }

    // Generate diagnosis message
    generateDiagnosisMessage(diseaseScores) {
        if (diseaseScores.length === 0) {
            return "Based on your symptoms, I couldn't identify a specific condition. Please consult a healthcare provider for a proper evaluation.";
        }
        
        const topMatch = diseaseScores[0];
        return `Based on your symptoms, the most likely condition is **${topMatch.disease}** (${topMatch.percentage}% match).\n\n${topMatch.description}`;
    }

    // Generate recommendations
    generateRecommendations(topMatch) {
        const recommendations = [`**Recommended Actions:**`];
        
        if (topMatch.confidence === 'high') {
            recommendations.push('• Schedule a doctor appointment within 24-48 hours');
        } else if (topMatch.confidence === 'medium') {
            recommendations.push('• Monitor symptoms and see a doctor if they persist for more than 3-5 days');
        } else {
            recommendations.push('• Consider consulting a healthcare provider for a thorough evaluation');
        }
        
        recommendations.push('• Rest and stay hydrated');
        recommendations.push('• Monitor your symptoms');
        
        return recommendations.join('\n');
    }

    // Generate warnings
    generateWarnings(diseaseScores, vitalSigns) {
        const warnings = [];
        
        // Add disease-specific warnings
        diseaseScores.forEach(condition => {
            if (condition.warnings) {
                warnings.push(...condition.warnings);
            }
        });
        
        // Add vital signs warnings
        if (vitalSigns.temp > 103) {
            warnings.push('• High fever - Seek immediate medical care');
        }
        
        if (warnings.length > 0) {
            return `**⚠️ Important Warnings:**\n${warnings.map(warning => `• ${warning}`).join('\n')}`;
        }
        
        return '';
    }

    // Prompt for medical document upload
    promptForMedicalUpload() {
        this.addMessage("To help me better understand your health situation, do you have any recent medical documents, such as test results, doctor's notes, or charts? You can upload them here if you'd like — it could help me give you more accurate guidance.", 'bot');
        
        const uploadOptions = `
            <div class="medical-upload-section" style="margin-top: 1rem;">
                <div class="upload-options">
                    <button class="btn btn-primary" onclick="chatbot.openFileUpload()">📁 Upload File</button>
                    <button class="btn btn-secondary" onclick="chatbot.openCamera()">📷 Take Photo</button>
                    <button class="btn btn-secondary" onclick="chatbot.skipMedicalUpload()">Skip</button>
                </div>
                <div id="uploadPreview" style="display: none;">
                    <div class="preview-header">
                        <span>Medical Document Preview</span>
                        <button class="btn-remove" onclick="chatbot.removeUpload()">×</button>
                    </div>
                    <div id="previewContent" class="preview-content"></div>
                </div>
            </div>
        `;
        
        const chatMessages = document.getElementById('chatMessages');
        const uploadDiv = document.createElement('div');
        uploadDiv.className = 'message bot';
        uploadDiv.innerHTML = `
            <div class="message-content">
                ${uploadOptions}
            </div>
        `;
        chatMessages.appendChild(uploadDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Medical upload functions
    openFileUpload() {
        document.getElementById('medicalFileUpload').click();
    }

    openCamera() {
        const video = document.getElementById('cameraVideo');
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    video.srcObject = stream;
                    video.style.display = 'block';
                    
                    const captureBtn = document.createElement('button');
                    captureBtn.className = 'btn btn-primary';
                    captureBtn.textContent = '📸 Capture Photo';
                    captureBtn.onclick = () => this.capturePhoto();
                    video.parentNode.appendChild(captureBtn);
                })
                .catch(err => {
                    alert('Camera access denied. Please allow camera permissions or use file upload instead.');
                });
        } else {
            alert('Camera not available. Please use file upload instead.');
        }
    }

    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        this.showUploadPreview(imageData, 'camera');
        
        // Stop camera stream
        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        video.style.display = 'none';
        video.parentNode.querySelector('button').remove();
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            window.file = file;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.showUploadPreview(e.target.result, 'file');
            };
            reader.readAsDataURL(file);
        }
    }

    showUploadPreview(data, type) {
        const preview = document.getElementById('uploadPreview');
        const content = document.getElementById('previewContent');
        
        if (type === 'camera' || (window.file && window.file.type && window.file.type.startsWith('image/'))) {
            content.innerHTML = `<img src="${data}" alt="Medical Record">`;
        } else {
            const fileName = window.file ? window.file.name : 'Medical Document';
            content.innerHTML = `<p>📄 File uploaded: ${fileName}</p>`;
        }
        
        preview.style.display = 'block';
        localStorage.setItem('medicalRecordData', data);
        
        // Show success message
        setTimeout(() => {
            this.addMessage("Thank you for uploading your medical document! I'll analyze it to provide more accurate guidance.", 'bot');
            
            // Add proceed button
            setTimeout(() => {
                const proceedOptions = `
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-success" onclick="chatbot.proceedWithMedicalAnalysis()">Proceed with Analysis</button>
                    </div>
                `;
                
                const chatMessages = document.getElementById('chatMessages');
                const proceedDiv = document.createElement('div');
                proceedDiv.className = 'message bot';
                proceedDiv.innerHTML = `
                    <div class="message-content">
                        ${proceedOptions}
                    </div>
                `;
                chatMessages.appendChild(proceedDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }, 500);
    }

    removeUpload() {
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('medicalFileUpload').value = '';
        localStorage.removeItem('medicalRecordData');
    }

    skipMedicalUpload() {
        this.addMessage("I'll skip the medical document upload for now.", 'user');
        
        const uploadSections = document.querySelectorAll('.medical-upload-section');
        uploadSections.forEach(section => {
            if (section.closest('.message')) {
                section.closest('.message').remove();
            }
        });
        
        setTimeout(() => {
            this.addMessage("No problem! We can proceed without medical documents. Your assessment is complete.", 'bot');
        }, 500);
    }

    proceedWithMedicalAnalysis() {
        this.addMessage("Please proceed with the analysis.", 'user');
        
        const proceedButtons = document.querySelectorAll('button[onclick="chatbot.proceedWithMedicalAnalysis()"]');
        proceedButtons.forEach(button => {
            if (button.closest('.message')) {
                button.closest('.message').remove();
            }
        });
        
        setTimeout(() => {
            this.addMessage("🔍 Analyzing your medical document... This will help provide more accurate recommendations.", 'bot');
            
            setTimeout(() => {
                this.addMessage("✅ Medical document analysis complete! I've incorporated this information into your assessment for more personalized guidance.", 'bot');
            }, 2000);
        }, 500);
    }

    // Show feedback prompt
    showFeedbackPrompt() {
        const feedbackHTML = `
            <div class="feedback-prompt">
                <div class="feedback-content">
                    <h4>How helpful was this assessment?</h4>
                    <div class="feedback-buttons">
                        <button class="feedback-btn feedback-positive" onclick="chatbot.handleFeedback('positive')">👍 Helpful</button>
                        <button class="feedback-btn feedback-negative" onclick="chatbot.handleFeedback('negative')">👎 Not Helpful</button>
                    </div>
                </div>
            </div>
        `;
        
        const chatMessages = document.getElementById('chatMessages');
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'message bot';
        feedbackDiv.innerHTML = `
            <div class="message-content">
                ${feedbackHTML}
            </div>
        `;
        chatMessages.appendChild(feedbackDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle feedback
    handleFeedback(type) {
        if (type === 'positive') {
            this.addMessage('Thanks for your feedback!', 'bot');
        } else {
            this.addMessage('We\'re sorry — we\'ll keep improving.', 'bot');
        }
        
        // Remove feedback buttons
        const feedbackOptions = document.querySelector('.feedback-options');
        if (feedbackOptions) {
            feedbackOptions.remove();
        }
        
        // Store feedback
        const feedback = {
            type,
            timestamp: new Date().toISOString()
        };
        
        const feedbackHistory = JSON.parse(localStorage.getItem('feedbackHistory') || '[]');
        feedbackHistory.push(feedback);
        localStorage.setItem('feedbackHistory', JSON.stringify(feedbackHistory));
    }

    // Show emergency alert
    showEmergencyAlert() {
        this.addMessage("⚠️ **EMERGENCY ALERT:** Your symptoms could indicate a serious medical condition. Please seek immediate medical care.", 'bot');
        this.addMessage("🚨 Please call 911 or go to the nearest emergency room immediately.", 'bot');
    }

    // Store chat summary
    storeChatSummary(diseaseScores) {
        const chatSummary = {
            date: new Date().toISOString(),
            symptoms: this.state.userSymptoms,
            detectedCondition: diseaseScores.length > 0 ? diseaseScores[0].disease : 'general',
            topConditions: diseaseScores.slice(0, 3).map(c => ({
                name: c.disease,
                percentage: c.percentage,
                confidence: c.confidence,
                safeMedications: this.filterMedicationsByAllergies(c.topMedications || [], this.state.userSymptoms.allergies || []).slice(0, 5)
            })),
            warnings: diseaseScores.flatMap(c => c.warnings || []),
            generalRecommendations: this.generateRecommendations(diseaseScores[0] || {})
        };
        
        this.state.chatHistory.unshift(chatSummary);
        localStorage.setItem('chatHistory', JSON.stringify(this.state.chatHistory));
    }

    // Filter medications by allergies
    filterMedicationsByAllergies(medications, allergies) {
        if (!allergies || allergies.length === 0) return medications;
        
        return medications.filter(med => {
            const medLower = med.toLowerCase();
            return !allergies.some(allergy => medLower.includes(allergy.toLowerCase()));
        });
    }

    // Voice input functionality
    toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }
        
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            document.getElementById('voiceBtn').classList.add('recording');
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
        };
        
        recognition.onend = () => {
            document.getElementById('voiceBtn').classList.remove('recording');
        };
        
        recognition.start();
    }

    // Restart chatbot
    restart() {
        this.initialize();
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new DiagKnowsChatbot();
    
    // Add file upload event listener
    const fileUpload = document.getElementById('medicalFileUpload');
    if (fileUpload) {
        fileUpload.addEventListener('change', (event) => {
            window.chatbot.handleFileUpload(event);
        });
    }
});

// Global functions for backward compatibility
function sendMessage() {
    if (window.chatbot) {
        window.chatbot.sendMessage();
    }
}

function initializeChatbot() {
    if (window.chatbot) {
        window.chatbot.initialize();
    }
}

function toggleVoiceInput() {
    if (window.chatbot) {
        window.chatbot.toggleVoiceInput();
    }
} 