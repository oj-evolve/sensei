 // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDr02ajJ3lzU7zxLlWXnscK-hHENJpznS4",
            authDomain: "sensei-fitness-dojo.firebaseapp.com",
            projectId: "sensei-fitness-dojo",
            storageBucket: "sensei-fitness-dojo.firebasestorage.app",
            messagingSenderId: "616767334840",
            appId: "1:616767334840:web:6c6472f61b57a626d2474d",
            measurementId: "G-XF647BR3WN"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();
        const storage = firebase.storage();

        // Global Variables
        let currentClass = null;
        let currentClassName = null;
        let currentClassVideo = null;
        let currentUser = null;
        let blogPosts = [];
        let currentPostIndex = -1;
        let editingPostId = null;
        let currentMediaType = 'image';
        let isAuthenticated = false;
        let currentSlide = 0;
        let carouselInterval;
        let currentComments = [];
        let editingCommentId = null;
        let pollVotes = {};

        // Generate unique ID
        function generateId() {
            return Math.random().toString(36).substring(2, 10);
        }

        // Carousel Functions
        function changeSlide(direction) {
            const slides = document.querySelectorAll('.carousel-slide');
            const indicators = document.querySelectorAll('.carousel-indicator');
            
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');
            
            currentSlide = (currentSlide + direction + slides.length) % slides.length;
            
            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        }

        function goToSlide(index) {
            const slides = document.querySelectorAll('.carousel-slide');
            const indicators = document.querySelectorAll('.carousel-indicator');
            
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');
            
            currentSlide = index;
            
            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        }

        function startCarousel() {
            carouselInterval = setInterval(() => {
                changeSlide(1);
            }, 5000);
        }

        function stopCarousel() {
            clearInterval(carouselInterval);
        }

        // Auto-start carousel
        window.addEventListener('load', () => {
            startCarousel();
        });

        // Pause on hover
        document.addEventListener('DOMContentLoaded', () => {
            const carousel = document.querySelector('.hero-carousel');
            if (carousel) {
                carousel.addEventListener('mouseenter', stopCarousel);
                carousel.addEventListener('mouseleave', startCarousel);
            }
        });

        // Authentication Check
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                isAuthenticated = true;
                loadUserProfile(user);
                updateAuthUI(true);
            } else {
                isAuthenticated = false;
                updateAuthUI(false);
            }
            loadBlogPosts();
        });

        // Update Auth UI
        function updateAuthUI(loggedIn) {
            const authSection = document.getElementById('authSection');
            if (loggedIn) {
                authSection.innerHTML = `
                    <div class="profile-dropdown">
                        <div class="profile-trigger" onclick="toggleProfileDropdown()">
                            <div class="profile-avatar-small" id="navAvatar">JD</div>
                            <span style="color: white;">▼</span>
                        </div>
                        <div class="dropdown-menu" id="profileDropdown">
                            <div class="dropdown-header">
                                <h3 id="dropdownName">John Doe</h3>
                                <p id="dropdownEmail">john.doe@email.com</p>
                            </div>
                            <div class="dropdown-links">
                                <a onclick="showPage('profile')">👤 View Profile</a>
                                <a class="logout-btn" onclick="logout()">🚪 Logout</a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                authSection.innerHTML = `
                    <div class="auth-buttons">
                        <button class="btn-login" onclick="showPage('payment-plans')">Login</button>
                        <button class="btn-signup" onclick="showPage('payment-plans')">Sign Up</button>
                    </div>
                `;
            }
        }

        // Load User Profile from Firebase
        async function loadUserProfile(user) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    const name = data.fullName || user.displayName || 'User';
                    const email = data.email || user.email;
                    
                    document.getElementById('profileName').textContent = name;
                    document.getElementById('profileEmail').textContent = email;
                    document.getElementById('dropdownName').textContent = name;
                    document.getElementById('dropdownEmail').textContent = email;
                    
                    const initials = name.substring(0, 2).toUpperCase();
                    document.getElementById('profileAvatar').textContent = initials;
                    document.getElementById('navAvatar').textContent = initials;
                    
                    document.getElementById('editName').value = data.fullName || '';
                    document.getElementById('editUsername').value = data.username || '';
                    document.getElementById('editEmail').value = email;
                    document.getElementById('editPhone').value = data.phone || '';
                    document.getElementById('editCountry').value = data.country || '';
                    
                    if (data.currentClass) {
                        currentClass = data.currentClass.classId;
                        currentClassName = data.currentClass.className;
                        currentClassVideo = data.currentClass.videoUrl;
                        displayCurrentClass();
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            }
        }

        // Save Current Class to Firebase
        async function saveCurrentClass() {
            if (currentUser && currentClass) {
                try {
                    await db.collection('users').doc(currentUser.uid).update({
                        currentClass: {
                            classId: currentClass,
                            className: currentClassName,
                            videoUrl: currentClassVideo,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }
                    });
                } catch (error) {
                    console.error('Error saving class:', error);
                }
            }
        }

        // Navigation Functions
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('sidebarOverlay').classList.toggle('active');
        }

        function toggleProfileDropdown() {
            document.getElementById('profileDropdown').classList.toggle('active');
        }

        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('profileDropdown');
            const trigger = document.querySelector('.profile-trigger');
            if (dropdown && trigger && !trigger.contains(event.target) && !dropdown.contains(event.target)) {
                dropdown.classList.remove('active');
            }
        });

        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            
            document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            const activeLink = document.querySelector(`.nav-link[onclick="showPage('${pageId}')"]`);
            if (activeLink) activeLink.classList.add('active');
            
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
                document.getElementById('sidebarOverlay').classList.remove('active');
            }
            
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.remove('active');
            
            if (pageId === 'my-programme') {
                displayCurrentClass();
            }
        }

        // Initiate Signup - Redirect to payment page
        function initiateSignup(plan) {
            alert(`You have selected the ${plan} plan!\n\nYou will be redirected to complete your registration and payment.`);
            // Here you would redirect to your payment/signup page
            // window.location.href = `signup.html?plan=${plan}`;
        }

        // Select Class - Redirect to payment if not authenticated
        function selectClass(classId, className, videoUrl) {
            if (!isAuthenticated) {
                alert('Please sign up to access this class!\n\nYou will be redirected to our payment plans.');
                showPage('payment-plans');
                return;
            }
            
            currentClass = classId;
            currentClassName = className;
            currentClassVideo = videoUrl;
            
            saveCurrentClass();
            
            alert(`✓ ${className} selected!\n\nView your current class in "My Programme" section.`);
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                auth.signOut().then(() => {
                    alert('Logged out successfully!');
                    showPage('home');
                }).catch((error) => {
                    alert('Error logging out: ' + error.message);
                });
            }
        }

        // Video Functions
        function playVideo(videoUrl) {
            document.getElementById('modalVideoSource').src = videoUrl;
            document.getElementById('modalVideo').load();
            document.getElementById('videoModal').classList.add('active');
            document.getElementById('modalVideo').play();
        }

        function closeVideoModal() {
            document.getElementById('videoModal').classList.remove('active');
            const video = document.getElementById('modalVideo');
            video.pause();
            video.currentTime = 0;
        }

        function castToDevice(method) {
            const statusEl = document.getElementById('castStatus');
            const statusText = document.getElementById('castStatusText');
            const video = document.getElementById('modalVideo');
            const videoSrc = video.querySelector('source').src;
            
            document.querySelectorAll('.cast-btn').forEach(btn => btn.classList.remove('active'));
            
            statusEl.classList.add('active');
            
            if (method === 'wifi') {
                document.getElementById('wifiCastBtn').classList.add('active');
                statusText.innerHTML = '📡 Connecting via WiFi...<br><br>';
                
                if (window.chrome && chrome.cast) {
                    statusText.innerHTML += '✓ Chromecast detected<br>Initializing cast session...';
                    setTimeout(() => {
                        try {
                            const castSession = cast.framework.CastContext.getInstance().getCurrentSession();
                            if (castSession) {
                                const mediaInfo = new chrome.cast.media.MediaInfo(videoSrc, 'video/mp4');
                                const request = new chrome.cast.media.LoadRequest(mediaInfo);
                                castSession.loadMedia(request).then(() => {
                                    statusText.innerHTML = '✓ Casting to TV via WiFi<br>Video is now playing on your TV!';
                                });
                            } else {
                                statusText.innerHTML = '⚠️ No Chromecast device found<br><br>Make sure your TV is on the same WiFi network';
                            }
                        } catch (e) {
                            statusText.innerHTML = '⚠️ Chromecast not available<br><br>Requirements:<br>✓ Chromecast or Smart TV<br>✓ Same WiFi network<br>✓ Chromecast app installed';
                        }
                    }, 1500);
                } else if (window.WebKitPlaybackTargetAvailabilityEvent) {
                    statusText.innerHTML += '✓ AirPlay available<br>Tap the AirPlay icon on the video player';
                    video.setAttribute('x-webkit-airplay', 'allow');
                } else {
                    statusText.innerHTML = '📡 WiFi Casting Instructions:<br><br>' +
                        '1. Ensure TV and device are on same WiFi<br>' +
                        '2. Open TV\'s casting app (Chromecast/AirPlay)<br>' +
                        '3. Select this video to cast<br><br>' +
                        'Supported: Chromecast, Apple TV, Smart TVs';
                }
                
            } else if (method === 'bluetooth') {
                document.getElementById('bluetoothCastBtn').classList.add('active');
                statusText.innerHTML = '🔵 Connecting via Bluetooth...<br><br>';
                
                if (navigator.bluetooth) {
                    navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: ['battery_service']
                    }).then(device => {
                        statusText.innerHTML = `✓ Connected to ${device.name}<br><br>` +
                            'Note: Bluetooth may have limited video quality.<br>' +
                            'For best experience, use WiFi casting.';
                    }).catch(err => {
                        statusText.innerHTML = '⚠️ Bluetooth connection failed<br><br>' +
                            'Requirements:<br>' +
                            '✓ Enable Bluetooth on both devices<br>' +
                            '✓ Pair devices in settings first<br>' +
                            '✓ TV must support Bluetooth video';
                    });
                } else {
                    statusText.innerHTML = '🔵 Bluetooth Casting Instructions:<br><br>' +
                        '1. Enable Bluetooth on phone and TV<br>' +
                        '2. Pair devices in Bluetooth settings<br>' +
                        '3. Select TV as audio/video output<br><br>' +
                        '⚠️ Note: May have quality limitations';
                }
                
            } else if (method === 'usb') {
                document.getElementById('usbCastBtn').classList.add('active');
                statusText.innerHTML = '🔌 USB Connection Guide:<br><br>' +
                    '<strong>For Android:</strong><br>' +
                    '1. Connect USB-C to HDMI adapter<br>' +
                    '2. Connect HDMI cable to TV<br>' +
                    '3. Enable "Desktop Mode" or "Screen Mirroring"<br><br>' +
                    '<strong>For iPhone:</strong><br>' +
                    '1. Use Lightning to HDMI adapter<br>' +
                    '2. Connect HDMI cable to TV<br>' +
                    '3. Video will mirror automatically<br><br>' +
                    '✓ Best quality, no lag<br>' +
                    '✓ No WiFi required';
            }
        }

        // Age Filtering
        function filterByAge(age, section, event) {
            const container = section === 'exercise' ? 'exerciseClasses' : 'defenseClasses';
            const cards = document.querySelectorAll(`#${container} .class-card`);
            const buttons = event.target.parentElement.querySelectorAll('.age-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            cards.forEach(card => {
                if (age === 'all' || card.dataset.age === age) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Display Current Class
        function displayCurrentClass() {
            const display = document.getElementById('currentClassDisplay');
            
            if (currentClass && currentClassName && currentClassVideo) {
                display.innerHTML = `
                    <div style="text-align: center;">
                        <h3 style="color: #2c3e50; margin-bottom: 1rem;">${currentClassName}</h3>
                        <video class="current-class-video" controls>
                            <source src="${currentClassVideo}" type="video/mp4">
                        </video>
                        <p style="color: #7f8c8d; margin-top: 1rem;">Keep up the great work! Track your progress below.</p>
                    </div>
                `;
            } else {
                display.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 2rem;">No class selected. Select a class from Daily Exercise or Self Defense page.</p>';
            }
        }

        // Progress Tracking
        function updateProgress() {
            const classId = document.getElementById('classSelector').value;
            const progressData = {
                chacha: 85,
                pompies: 70,
                chauffling: 90,
                squatting: 65
            };
            
            const progress = progressData[classId] || 75;
            document.getElementById('overallProgress').style.width = progress + '%';
            document.getElementById('overallProgress').textContent = progress + '%';
        }

        // BMI & BMR Calculator
        function calculateBMI() {
            const weight = parseFloat(document.getElementById('weight').value);
            const height = parseFloat(document.getElementById('height').value) / 100;
            const age = parseInt(document.getElementById('age').value);
            const gender = document.getElementById('gender').value;
            const activityLevel = parseFloat(document.getElementById('activityLevel').value);

            if (!weight || !height || !age) {
                alert('Please fill in all fields');
                return;
            }

            const bmi = (weight / (height * height)).toFixed(1);
            
            let category = '';
            if (bmi < 18.5) {
                category = 'Underweight';
            } else if (bmi < 25) {
                category = 'Normal weight';
            } else if (bmi < 30) {
                category = 'Overweight';
            } else {
                category = 'Obese';
            }

            let bmr;
            if (gender === 'male') {
                bmr = (10 * weight) + (6.25 * (height * 100)) - (5 * age) + 5;
            } else {
                bmr = (10 * weight) + (6.25 * (height * 100)) - (5 * age) - 161;
            }

            const tdee = Math.round(bmr * activityLevel);

            document.getElementById('bmiResult').textContent = bmi;
            document.getElementById('bmiCategory').textContent = category;
            document.getElementById('bmrResult').textContent = tdee;
            document.getElementById('caloriesBurned').textContent = tdee;
        }

        // Show Event Detail
        function showEventDetail(eventId, title, description, day, month, location, time) {
            document.getElementById('eventTitle').textContent = title;
            document.getElementById('eventDescription').textContent = description;
            document.getElementById('eventDate').textContent = `📅 Date: ${day} ${month} 2024`;
            document.getElementById('eventLocation').textContent = `📍 Location: ${location}`;
            document.getElementById('eventTime').textContent = `⏰ Time: ${time}`;
            
            showPage('event-detail');
        }

        // Update Profile
        async function updateProfile(event) {
            event.preventDefault();
            
            if (!currentUser) {
                alert('You must be logged in to update your profile');
                return;
            }

            const fullName = document.getElementById('editName').value;
            const username = document.getElementById('editUsername').value;
            const email = document.getElementById('editEmail').value;
            const phone = document.getElementById('editPhone').value;
            const country = document.getElementById('editCountry').value;

            try {
                await db.collection('users').doc(currentUser.uid).update({
                    fullName: fullName,
                    username: username,
                    email: email,
                    phone: phone,
                    country: country,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('profileName').textContent = fullName;
                document.getElementById('dropdownName').textContent = fullName;
                const initials = fullName.substring(0, 2).toUpperCase();
                document.getElementById('profileAvatar').textContent = initials;
                document.getElementById('navAvatar').textContent = initials;

                alert('Profile updated successfully!\n\nYour changes have been saved.');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile: ' + error.message);
            }
        }

        // Contact Coach Function
        function contactCoach() {
            const coachMessage = `
                📞 Contact a Coach
                
                Our expert fitness coaches are here to help you!
                
                What we offer:
                ✓ Personalized fitness plans
                ✓ Nutrition guidance
                ✓ Form correction and technique tips
                ✓ Motivation and accountability
                ✓ Progress tracking and adjustments
                
                Contact Methods:
                📧 Email: coach@senseifitness.com
                📱 WhatsApp: +234 801 234 5678
                💬 Live Chat: Available 9am - 9pm WAT
                
                Response time: Within 24 hours
                
                A coach will reach out to schedule your free consultation!
            `;
            
            if (confirm(coachMessage + '\n\nWould you like us to contact you?')) {
                if (currentUser) {
                    db.collection('coachRequests').add({
                        userId: currentUser.uid,
                        userName: document.getElementById('profileName').textContent,
                        userEmail: document.getElementById('profileEmail').textContent,
                        requestDate: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'pending'
                    }).then(() => {
                        alert('✓ Request sent!\n\nA coach will contact you within 24 hours via email or phone.');
                    }).catch(error => {
                        console.error('Error sending request:', error);
                        alert('✓ We\'ve noted your interest!\n\nPlease contact us directly at coach@senseifitness.com');
                    });
                } else {
                    alert('✓ We\'ve noted your interest!\n\nPlease contact us at:\n📧 coach@senseifitness.com\n📱 +234 801 234 5678');
                }
            }
        }

        // ========================================
        // BLOG FUNCTIONS WITH FIREBASE
        // ========================================

        // Load Blog Posts from Firebase
        async function loadBlogPosts() {
            try {
                const snapshot = await db.collection('blogPosts').orderBy('date', 'desc').get();
                blogPosts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                renderBlogPosts();
            } catch (error) {
                console.error('Error loading blog posts:', error);
                blogPosts = [];
                renderBlogPosts();
            }
        }

        // Render Blog Posts List
        function renderBlogPosts() {
            const container = document.getElementById('blogPostsList');
            
            if (blogPosts.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 2rem;">No blog posts yet. Create your first post!</p>';
                return;
            }

            container.innerHTML = blogPosts.map((post, index) => {
                const date = post.date ? new Date(post.date.toDate ? post.date.toDate() : post.date) : new Date();
                const excerpt = post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
                
                let mediaHtml = '';
                if (post.mediaType === 'image' && post.mediaUrl) {
                    mediaHtml = `<img src="${post.mediaUrl}" alt="${post.title}" class="blog-post-header">`;
                } else if (post.mediaType === 'video' && post.mediaUrl) {
                    mediaHtml = `<video src="${post.mediaUrl}" class="blog-post-header" controls></video>`;
                }

                const canEdit = isAuthenticated && currentUser && post.authorId === currentUser.uid;

                return `
                    <div class="blog-post-card" onclick="viewPost(${index})">
                        ${mediaHtml}
                        <div class="blog-post-content">
                            <h3 class="blog-post-title">${post.title}</h3>
                            <div class="blog-post-meta">
                                <span>📅 ${date.toLocaleDateString()}</span>
                                <span>✍️ ${post.author || 'Anonymous'}</span>
                            </div>
                            <p class="blog-post-excerpt">${excerpt}</p>
                            <div class="blog-post-actions" onclick="event.stopPropagation()">
                                <button class="btn btn-primary btn-small" onclick="viewPost(${index})">Read More</button>
                                ${canEdit ? `
                                    <button class="btn btn-secondary btn-small" onclick="editPost(${index})">Edit</button>
                                    <button class="btn btn-danger btn-small" onclick="deletePost(${index})">Delete</button>
                                ` : ''}
                                <button class="btn btn-download btn-small" onclick="downloadPost(${index})">Download</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Show Blog Editor
        function showBlogEditor() {
            if (!isAuthenticated) {
                alert('Please sign up to create blog posts!');
                showPage('payment-plans');
                return;
            }

            editingPostId = null;
            document.getElementById('editorTitle').textContent = 'Create New Post';
            document.getElementById('postTitle').value = '';
            document.getElementById('postMediaUrl').value = '';
            document.getElementById('postContent').innerHTML = 'Start writing your post here...';
            currentMediaType = 'image';
            updateMediaTypeButtons();
            showPage('blog-editor');
        }

        // Select Media Type
        function selectMediaType(type) {
            currentMediaType = type;
            updateMediaTypeButtons();
            
            const mediaUrlField = document.getElementById('mediaUrlField');
            const mediaUploadField = document.getElementById('mediaUploadField');
            const mediaInput = document.getElementById('postMediaUrl');
            const label = mediaUrlField.querySelector('label');
            
            if (type === 'none') {
                mediaUrlField.style.display = 'none';
                mediaUploadField.style.display = 'none';
            } else if (type === 'upload') {
                mediaUrlField.style.display = 'none';
                mediaUploadField.style.display = 'block';
            } else {
                mediaUrlField.style.display = 'block';
                mediaUploadField.style.display = 'none';
                label.textContent = type === 'image' ? 'Image URL' : 'Video URL';
                mediaInput.placeholder = type === 'image' 
                    ? 'https://example.com/image.jpg' 
                    : 'https://example.com/video.mp4';
            }
        }

        // Update Media Type Buttons
        function updateMediaTypeButtons() {
            document.querySelectorAll('.media-type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const types = ['image', 'video', 'upload', 'none'];
            const index = types.indexOf(currentMediaType);
            if (index >= 0) {
                document.querySelectorAll('.media-type-btn')[index].classList.add('active');
            }
        }

        // Format Text in Editor
        function formatText(command, value = null) {
            document.getElementById('postContent').focus();
            document.execCommand(command, false, value);
        }

        // Upload Media to Firebase Storage
        async function uploadMedia(file) {
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`blog-media/${Date.now()}_${file.name}`);
            
            try {
                await fileRef.put(file);
                const downloadURL = await fileRef.getDownloadURL();
                return downloadURL;
            } catch (error) {
                console.error('Error uploading file:', error);
                throw error;
            }
        }

        // Save Post to Firebase
        async function savePost() {
            if (!isAuthenticated) {
                alert('Please sign up to create blog posts!');
                return;
            }

            const title = document.getElementById('postTitle').value.trim();
            const content = document.getElementById('postContent').innerHTML;
            let mediaUrl = document.getElementById('postMediaUrl').value.trim();

            if (!title) {
                alert('Please enter a post title');
                return;
            }

            if (content === 'Start writing your post here...' || !content.trim()) {
                alert('Please write some content for your post');
                return;
            }

            try {
                // Handle file upload if media type is 'upload'
                if (currentMediaType === 'upload') {
                    const fileInput = document.getElementById('postMediaFile');
                    if (fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        mediaUrl = await uploadMedia(file);
                        currentMediaType = file.type.startsWith('image/') ? 'image' : 'video';
                    }
                }

                const post = {
                    title: title,
                    content: content,
                    mediaType: currentMediaType,
                    mediaUrl: mediaUrl,
                    author: document.getElementById('profileName').textContent || 'Anonymous',
                    authorId: currentUser.uid,
                    updatedDate: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (editingPostId) {
                    await db.collection('blogPosts').doc(editingPostId).update(post);
                    alert('✓ Post updated successfully!');
                } else {
                    post.date = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('blogPosts').add(post);
                    alert('✓ Post created successfully!');
                }

                await loadBlogPosts();
                showPage('blog');
            } catch (error) {
                console.error('Error saving post:', error);
                alert('Error saving post: ' + error.message);
            }
        }

        // Cancel Edit
        function cancelEdit() {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                showPage('blog');
            }
        }

        // Edit Post
        function editPost(index) {
            const post = blogPosts[index];
            
            if (!isAuthenticated || !currentUser || post.authorId !== currentUser.uid) {
                alert('You can only edit your own posts!');
                return;
            }

            editingPostId = post.id;
            
            document.getElementById('editorTitle').textContent = 'Edit Post';
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postMediaUrl').value = post.mediaUrl || '';
            document.getElementById('postContent').innerHTML = post.content;
            
            currentMediaType = post.mediaType || 'image';
            selectMediaType(currentMediaType);
            
            showPage('blog-editor');
        }

        // Delete Post from Firebase
        async function deletePost(index) {
            const post = blogPosts[index];
            
            if (!isAuthenticated || !currentUser || post.authorId !== currentUser.uid) {
                alert('You can only delete your own posts!');
                return;
            }

            if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                try {
                    await db.collection('blogPosts').doc(post.id).delete();
                    alert('✓ Post deleted successfully!');
                    await loadBlogPosts();
                } catch (error) {
                    console.error('Error deleting post:', error);
                    alert('Error deleting post: ' + error.message);
                }
            }
        }

        // View Post
        async function viewPost(index) {
            currentPostIndex = index;
            const post = blogPosts[index];
            const date = post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt) : new Date();
            
            let mediaHtml = '';
            if (post.mediaType === 'image' && post.media) {
                mediaHtml = `<img src="${post.media}" alt="${post.title}" class="blog-post-view-header">`;
            } else if (post.mediaType === 'video' && post.media) {
                mediaHtml = `<video src="${post.media}" class="blog-post-view-header" controls></video>`;
            }

            document.getElementById('blogPostViewContent').innerHTML = `
                ${mediaHtml}
                <h1 class="blog-post-view-title">${post.title}</h1>
                <div class="blog-post-meta" style="margin-bottom: 2rem;">
                    <span>📅 ${date.toLocaleDateString()}</span>
                    <span>✍️ ${post.author || 'Anonymous'}</span>
                </div>
                <div style="line-height: 1.8; color: #2c3e50;">
                    ${post.content}
                </div>
            `;

            document.getElementById('prevPostBtn').disabled = index === 0;
            document.getElementById('nextPostBtn').disabled = index === blogPosts.length - 1;

            // Load poll
            loadPoll(post.id);

            // Load comments
            await loadComments(post.id);

            showPage('blog-post-view');
        }

        // Social Share Functions
        function shareOnSocial(platform) {
            const post = blogPosts[currentPostIndex];
            const url = window.location.href;
            const text = encodeURIComponent(post.title);
            
            let shareUrl = '';
            
            if (platform === 'facebook') {
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            } else if (platform === 'twitter') {
                shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            } else if (platform === 'instagram') {
                alert('To share on Instagram:\n\n1. Take a screenshot of this post\n2. Open Instagram app\n3. Create a new post/story\n4. Upload the screenshot\n\nInstagram doesn\'t support direct web sharing yet!');
                return;
            }
            
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }

        // Poll Functions
        function loadPoll(postId) {
            const pollOptions = [
                { id: 'yes', text: 'Yes, very helpful!', votes: 0 },
                { id: 'somewhat', text: 'Somewhat helpful', votes: 0 },
                { id: 'no', text: 'Not really', votes: 0 }
            ];

            // Load votes from localStorage
            const savedVotes = JSON.parse(localStorage.getItem(`poll_${postId}`) || '{}');
            pollVotes = savedVotes;

            const totalVotes = Object.values(savedVotes).reduce((a, b) => a + b, 0);
            const hasVoted = localStorage.getItem(`poll_voted_${postId}`);

            const pollContainer = document.getElementById('pollOptions');
            pollContainer.innerHTML = pollOptions.map(option => {
                const votes = savedVotes[option.id] || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                
                if (hasVoted) {
                    return `
                        <div class="poll-option">
                            <div class="poll-bar" style="width: ${percentage}%"></div>
                            <div class="poll-result poll-text">
                                <span>${option.text}</span>
                                <span>${percentage}% (${votes} votes)</span>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="poll-option" onclick="votePoll('${postId}', '${option.id}')">
                            <div class="poll-text">${option.text}</div>
                        </div>
                    `;
                }
            }).join('');
        }

        function votePoll(postId, optionId) {
            const savedVotes = JSON.parse(localStorage.getItem(`poll_${postId}`) || '{}');
            savedVotes[optionId] = (savedVotes[optionId] || 0) + 1;
            localStorage.setItem(`poll_${postId}`, JSON.stringify(savedVotes));
            localStorage.setItem(`poll_voted_${postId}`, 'true');
            
            loadPoll(postId);
        }

        // Comments Functions
        async function loadComments(postId) {
            try {
                const snapshot = await db.collection('blogPosts').doc(postId).collection('comments').orderBy('createdAt', 'desc').get();
                currentComments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                renderComments();
            } catch (error) {
                console.error('Error loading comments:', error);
                currentComments = [];
                renderComments();
            }
        }

        function renderComments() {
            document.getElementById('commentCount').textContent = currentComments.length;
            
            const container = document.getElementById('commentsContainer');
            if (currentComments.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 2rem;">No comments yet. Be the first to comment!</p>';
                return;
            }

            container.innerHTML = currentComments.map(comment => {
                const date = comment.createdAt ? new Date(comment.createdAt.toDate ? comment.createdAt.toDate() : comment.createdAt) : new Date();
                const canEdit = isAuthenticated && currentUser && comment.authorId === currentUser.uid;

                return `
                    <div class="comment-card" id="comment-${comment.id}">
                        <div class="comment-header">
                            <span class="comment-author">${comment.author}</span>
                            <span class="comment-date">${date.toLocaleString()}</span>
                        </div>
                        <div class="comment-content" id="comment-content-${comment.id}">
                            ${comment.content}
                        </div>
                        ${canEdit ? `
                            <div class="comment-actions">
                                <button class="btn btn-secondary btn-small" onclick="editComment('${comment.id}', '${comment.content.replace(/'/g, "\\'")}')">Edit</button>
                                <button class="btn btn-danger btn-small" onclick="deleteComment('${comment.id}')">Delete</button>
                            </div>
                            <div class="comment-edit-area" id="comment-edit-${comment.id}" style="display: none;">
                                <input type="text" class="comment-edit-input" id="comment-edit-input-${comment.id}" value="${comment.content.replace(/"/g, '&quot;')}">
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-primary btn-small" onclick="saveCommentEdit('${comment.id}')">Save</button>
                                    <button class="btn btn-secondary btn-small" onclick="cancelCommentEdit('${comment.id}')">Cancel</button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        function handleCommentKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                submitComment();
            }
        }

        async function submitComment() {
            if (!isAuthenticated) {
                alert('Please sign up to comment!');
                showPage('payment-plans');
                return;
            }

            const input = document.getElementById('commentInput');
            const content = input.value.trim();

            if (!content) {
                alert('Please enter a comment');
                return;
            }

            try {
                const post = blogPosts[currentPostIndex];
                const commentId = generateId();
                
                await db.collection('blogPosts').doc(post.id).collection('comments').doc(commentId).set({
                    id: commentId,
                    content: content,
                    author: document.getElementById('profileName').textContent || 'Anonymous',
                    authorId: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                input.value = '';
                await loadComments(post.id);
            } catch (error) {
                console.error('Error submitting comment:', error);
                alert('Error submitting comment: ' + error.message);
            }
        }

        function editComment(commentId, content) {
            document.getElementById(`comment-content-${commentId}`).style.display = 'none';
            document.getElementById(`comment-edit-${commentId}`).style.display = 'block';
        }

        function cancelCommentEdit(commentId) {
            document.getElementById(`comment-content-${commentId}`).style.display = 'block';
            document.getElementById(`comment-edit-${commentId}`).style.display = 'none';
        }

        async function saveCommentEdit(commentId) {
            const input = document.getElementById(`comment-edit-input-${commentId}`);
            const newContent = input.value.trim();

            if (!newContent) {
                alert('Comment cannot be empty');
                return;
            }

            try {
                const post = blogPosts[currentPostIndex];
                await db.collection('blogPosts').doc(post.id).collection('comments').doc(commentId).update({
                    content: newContent,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await loadComments(post.id);
            } catch (error) {
                console.error('Error updating comment:', error);
                alert('Error updating comment: ' + error.message);
            }
        }

        async function deleteComment(commentId) {
            if (!confirm('Are you sure you want to delete this comment?')) {
                return;
            }

            try {
                const post = blogPosts[currentPostIndex];
                await db.collection('blogPosts').doc(post.id).collection('comments').doc(commentId).delete();
                await loadComments(post.id);
            } catch (error) {
                console.error('Error deleting comment:', error);
                alert('Error deleting comment: ' + error.message);
            }
        }

        // Navigate Between Posts
        function navigatePost(direction) {
            if (direction === 'prev' && currentPostIndex > 0) {
                viewPost(currentPostIndex - 1);
            } else if (direction === 'next' && currentPostIndex < blogPosts.length - 1) {
                viewPost(currentPostIndex + 1);
            }
        }

        // Download Post
        function downloadPost(index) {
            const post = blogPosts[index];
            const content = `
${post.title}
${'='.repeat(post.title.length)}

Author: ${post.author || 'Anonymous'}
Date: ${post.date ? new Date(post.date.toDate ? post.date.toDate() : post.date).toLocaleDateString() : 'N/A'}

${post.content.replace(/<[^>]*>/g, '\n')}
            `;
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // Initialize on page load
        window.addEventListener('load', () => {
            displayCurrentClass();
            loadBlogPosts();
        });