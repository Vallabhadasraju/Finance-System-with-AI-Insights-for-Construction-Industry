// Dashboard JavaScript functionality

// Backend API base URL (update if your FastAPI runs elsewhere)
const API_BASE = 'http://127.0.0.1:8000';

// Consistent UI formatting for IDs (display only; does not affect backend payloads)
function formatId(id, type) {
    if (!id) return '-';
    const trimmed = String(id).trim();
    if (type === 'txn') return `TXN-${trimmed}`;
    if (type === 'cust') return `CUST-${trimmed}`;
    return trimmed;
}

// ===== Chart.js handles to avoid duplicates =====
let charts = {
    confusion: null,
    roc: null,
    fraudVsLegit: null,
    fraudTrend: null,
    channelPie: null,
    amountScatter: null
};

// State for last payload to support explain
let lastPredictionPayload = null;

// Toggle profile menu
function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileMenu');
    profileMenu.classList.toggle('active');
}

// Close profile menu when clicking outside
document.addEventListener('click', function(event) {
    const profileSection = document.querySelector('.profile-section');
    const profileMenu = document.getElementById('profileMenu');
    
    if (!profileSection.contains(event.target)) {
        profileMenu.classList.remove('active');
    }
});

// Handle profile menu item clicks
document.addEventListener('DOMContentLoaded', function() {
    const profileMenuItems = document.querySelectorAll('.profile-menu-item');
    
    profileMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            const action = this.querySelector('span').textContent;
            
            switch(action) {
                case 'My Profile':
                    console.log('Opening profile page...');
                    showProfileModal();
                    break;
                case 'Settings':
                    console.log('Opening settings page...');
                    showSettingsModal();
                    break;
                case 'Logout':
                    console.log('Logout requested...');
                    // Check if logout confirmation is required
                    const requireConfirmation = localStorage.getItem('requireConfirmation') !== 'false';
                    if (requireConfirmation) {
                        showLogoutModal();
                    } else {
                        confirmLogout();
                    }
                    break;
            }
            
            // Close the menu after selection
            document.getElementById('profileMenu').classList.remove('active');
        });
    });
});

// Add smooth scrolling for better UX
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for any anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Add loading animation for dashboard content
function showLoading() {
    const dashboardContainer = document.querySelector('.dashboard-container');
    dashboardContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading dashboard...</p>
        </div>
    `;
}

function hideLoading() {
    // This function can be used to hide loading and show actual content
    console.log('Loading complete');
}

// Example usage: showLoading() when fetching data
// hideLoading() when data is ready

// Add keyboard navigation support
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Close profile menu on Escape key
        const profileMenu = document.getElementById('profileMenu');
        profileMenu.classList.remove('active');
    }
});

// Add touch support for mobile devices
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(event) {
    touchStartY = event.changedTouches[0].screenY;
});

document.addEventListener('touchend', function(event) {
    touchEndY = event.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe up - could be used for additional functionality
            console.log('Swiped up');
        } else {
            // Swipe down - could be used for additional functionality
            console.log('Swiped down');
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized successfully!');
    
    // Load and display user's name
    loadUserName();
    
    // Initialize file upload functionality
    initializeFileUpload();
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize transaction form
    initializeTransactionForm();
    
    // You can add more initialization logic here
    // For example: load user data, fetch dashboard statistics, etc.
});

// Load and display user's name from localStorage
function loadUserName() {
    const userNameElement = document.getElementById('userName');
    const storedFirstName = localStorage.getItem('userFirstName');
    
    if (storedFirstName && storedFirstName !== 'User') {
        userNameElement.textContent = storedFirstName;
        console.log('Welcome, ' + storedFirstName + '!');
    } else {
        // If no name stored, try to get from URL parameters or show default
        const urlParams = new URLSearchParams(window.location.search);
        const nameFromUrl = urlParams.get('name');
        
        if (nameFromUrl) {
            userNameElement.textContent = nameFromUrl;
            localStorage.setItem('userFirstName', nameFromUrl);
        } else {
            userNameElement.textContent = 'User';
        }
    }
}

// ===== FILE UPLOAD AND DATASET ANALYSIS =====

let currentDataset = null;

// Initialize file upload functionality
function initializeFileUpload() {
    const fileInput = document.getElementById('csvFileInput');
    const uploadArea = document.getElementById('fileUploadArea');
    
    // File input change event
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Remove the click event from upload area to prevent double triggering
    // Only the button should trigger file selection
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        processCSVFile(file);
    } else if (file) {
        // Only show alert if file is selected but wrong type
        alert('Please select a valid CSV file!');
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/csv') {
        processCSVFile(files[0]);
    } else {
        alert('Please drop a valid CSV file!');
    }
}

// Process CSV file
function processCSVFile(file) {
    showUploadProgress();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const dataset = parseCSV(csvData);
            currentDataset = dataset;
            
                         hideUploadProgress();
             performDatasetAnalysis(dataset);
             showAnalysisResults();
        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Please check the file format.');
            hideUploadProgress();
        }
    };
    
    reader.readAsText(file);
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return { headers, data, rawText: csvText };
}

// Show upload progress
function showUploadProgress() {
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('fileUploadArea').style.display = 'none';
    
    // Simulate progress
    let progress = 0;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            progressText.textContent = 'Processing dataset...';
        }
        progressFill.style.width = progress + '%';
    }, 100);
}

// Hide upload progress
function hideUploadProgress() {
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('fileUploadArea').style.display = 'block';
}

// Show analysis results
function showAnalysisResults() {
    document.getElementById('analysisResults').style.display = 'block';
}

// Perform comprehensive dataset analysis
function performDatasetAnalysis(dataset) {
    console.log('Analyzing dataset:', dataset);
    
    // Basic Statistics
    displayBasicStatistics(dataset);
    
    // Data Quality Analysis
    displayDataQuality(dataset);
    
    // Column Analysis
    displayColumnAnalysis(dataset);
    
    // Data Distribution
    displayDataDistribution(dataset);
    
    // Correlation Analysis
    displayCorrelationAnalysis(dataset);
    
    // Missing Values Analysis
    displayMissingValues(dataset);
    
         // Fraud vs Legitimate Analysis
     displayFraudAnalysis(dataset);
     
     // Transaction Summary
     displayTransactionSummary(dataset);
     
     // Spending Categories
     displaySpendingCategories(dataset);
}

// Display basic statistics
function displayBasicStatistics(dataset) {
    const statsContainer = document.getElementById('basicStats');
    const { headers, data } = dataset;
    
    const stats = [
        { label: 'Total Rows', value: data.length },
        { label: 'Total Columns', value: headers.length },
        { label: 'File Size', value: formatFileSize(dataset.rawText.length) },
        { label: 'Memory Usage', value: formatFileSize(JSON.stringify(data).length) }
    ];
    
    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <h5>${stat.label}</h5>
            <div class="stat-value">${stat.value}</div>
        </div>
    `).join('');
}

// Display data quality metrics
function displayDataQuality(dataset) {
    const qualityContainer = document.getElementById('dataQuality');
    const { headers, data } = dataset;
    
    const totalCells = headers.length * data.length;
    const emptyCells = data.reduce((count, row) => {
        return count + headers.filter(header => !row[header] || row[header].trim() === '').length;
    }, 0);
    
    const completeness = ((totalCells - emptyCells) / totalCells * 100).toFixed(2);
    const consistency = calculateDataConsistency(dataset);
    const uniqueness = calculateDataUniqueness(dataset);
    
    const metrics = [
        { label: 'Data Completeness', value: completeness + '%' },
        { label: 'Data Consistency', value: consistency + '%' },
        { label: 'Data Uniqueness', value: uniqueness + '%' },
        { label: 'Empty Cells', value: emptyCells }
    ];
    
    qualityContainer.innerHTML = metrics.map(metric => `
        <div class="quality-metric">
            <h6>${metric.label}</h6>
            <div class="metric-value">${metric.value}</div>
        </div>
    `).join('');
}

// Display column analysis
function displayColumnAnalysis(dataset) {
    const columnContainer = document.getElementById('columnAnalysis');
    const { headers, data } = dataset;
    
    const columnInfo = headers.map(header => {
        const values = data.map(row => row[header]).filter(v => v && v.trim() !== '');
        const uniqueValues = new Set(values).size;
        const dataType = inferDataType(values);
        
        return { header, uniqueValues, dataType, totalValues: values.length };
    });
    
    columnContainer.innerHTML = columnInfo.map(col => `
        <div class="column-card">
            <h6>${col.header}</h6>
            <div class="column-info">
                <p><strong>Data Type:</strong> ${col.dataType}</p>
                <p><strong>Unique Values:</strong> ${col.uniqueValues}</p>
                <p><strong>Total Values:</strong> ${col.totalValues}</p>
                <p><strong>Missing Values:</strong> ${data.length - col.totalValues}</p>
            </div>
        </div>
    `).join('');
}

// Display data distribution
function displayDataDistribution(dataset) {
    const distributionContainer = document.getElementById('dataDistribution');
    const { headers, data } = dataset;
    
    // Find numeric columns for distribution analysis
    const numericColumns = headers.filter(header => {
        const values = data.map(row => row[header]).filter(v => v && v.trim() !== '');
        return values.length > 0 && !isNaN(values[0]);
    }).slice(0, 4); // Limit to 4 columns for display
    
    const distributionHTML = numericColumns.map(col => {
        const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const median = calculateMedian(values);
        
        return `
            <div class="chart-container">
                <h6>${col} Distribution</h6>
                <div class="column-info">
                    <p><strong>Min:</strong> ${min.toFixed(2)}</p>
                    <p><strong>Max:</strong> ${max.toFixed(2)}</p>
                    <p><strong>Mean:</strong> ${mean.toFixed(2)}</p>
                    <p><strong>Median:</strong> ${median.toFixed(2)}</p>
                    <p><strong>Range:</strong> ${(max - min).toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');
    
    distributionContainer.innerHTML = distributionHTML || '<p>No numeric columns found for distribution analysis.</p>';
}

// Display correlation analysis
function displayCorrelationAnalysis(dataset) {
    const correlationContainer = document.getElementById('correlationAnalysis');
    const { headers, data } = dataset;
    
    // Find numeric columns
    const numericColumns = headers.filter(header => {
        const values = data.map(row => row[header]).filter(v => v && v.trim() !== '');
        return values.length > 0 && !isNaN(values[0]);
    });
    
    if (numericColumns.length < 2) {
        correlationContainer.innerHTML = '<p>Need at least 2 numeric columns for correlation analysis.</p>';
        return;
    }
    
    // Calculate correlation matrix
    const correlationMatrix = calculateCorrelationMatrix(numericColumns, data);
    
    // Create correlation table
    let tableHTML = '<table class="correlation-table"><thead><tr><th>Column</th>';
    numericColumns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    numericColumns.forEach((col1, i) => {
        tableHTML += `<tr><td><strong>${col1}</strong></td>`;
        numericColumns.forEach((col2, j) => {
            const correlation = correlationMatrix[i][j];
            const color = Math.abs(correlation) > 0.7 ? '#00ff00' : 
                         Math.abs(correlation) > 0.5 ? '#ffff00' : '#ffffff';
            tableHTML += `<td style="color: ${color}">${correlation.toFixed(3)}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    
    correlationContainer.innerHTML = tableHTML;
}

// Display missing values analysis
function displayMissingValues(dataset) {
    const missingContainer = document.getElementById('missingValues');
    const { headers, data } = dataset;
    
    const missingAnalysis = headers.map(header => {
        const missingCount = data.filter(row => !row[header] || row[header].trim() === '').length;
        const missingPercentage = (missingCount / data.length * 100).toFixed(2);
        
        return { header, missingCount, missingPercentage };
    }).filter(col => col.missingCount > 0);
    
    if (missingAnalysis.length === 0) {
        missingContainer.innerHTML = '<p>No missing values found in the dataset! 🎉</p>';
        return;
    }
    
    missingContainer.innerHTML = missingAnalysis.map(col => `
        <div class="missing-card">
            <h6>${col.header}</h6>
            <div class="missing-count">${col.missingCount}</div>
            <p>${col.missingPercentage}% of total</p>
        </div>
    `).join('');
}

// Display fraud vs legitimate analysis
function displayFraudAnalysis(dataset) {
    const fraudContainer = document.getElementById('fraudAnalysis');
    const { headers, data } = dataset;
    
    // Try to find fraud-related columns
    const fraudColumns = headers.filter(header => 
        header.toLowerCase().includes('fraud') || 
        header.toLowerCase().includes('is_fraud') ||
        header.toLowerCase().includes('class') ||
        header.toLowerCase().includes('target')
    );
    
    if (fraudColumns.length > 0) {
        const fraudColumn = fraudColumns[0];
        const fraudValues = data.map(row => row[fraudColumn]).filter(v => v && v.trim() !== '');
        
        // Count fraud vs legitimate
        const fraudCount = fraudValues.filter(v => 
            v.toString().toLowerCase() === '1' || 
            v.toString().toLowerCase() === 'true' || 
            v.toString().toLowerCase() === 'fraud' ||
            v.toString().toLowerCase() === 'yes'
        ).length;
        
        const legitimateCount = fraudValues.length - fraudCount;
        const totalCount = fraudValues.length;
        
        const fraudPercentage = totalCount > 0 ? ((fraudCount / totalCount) * 100).toFixed(2) : 0;
        const legitimatePercentage = totalCount > 0 ? ((legitimateCount / totalCount) * 100).toFixed(2) : 0;
        
        fraudContainer.innerHTML = `
            <div class="fraud-card">
                <h6>🕵️ Fraudulent Transactions</h6>
                <div class="fraud-count">${fraudCount}</div>
                <div class="fraud-percentage">${fraudPercentage}% of total</div>
            </div>
            <div class="fraud-card legitimate">
                <h6>✅ Legitimate Transactions</h6>
                <div class="fraud-count">${legitimateCount}</div>
                <div class="fraud-percentage">${legitimatePercentage}% of total</div>
            </div>
        `;
    } else {
        // If no fraud column found, show generic analysis
        fraudContainer.innerHTML = `
            <div class="fraud-card">
                <h6>📊 Transaction Analysis</h6>
                <div class="fraud-count">${data.length}</div>
                <div class="fraud-percentage">Total transactions analyzed</div>
            </div>
        `;
    }
}

// ===== HELPER FUNCTIONS =====

// Calculate data consistency
function calculateDataConsistency(dataset) {
    const { headers, data } = dataset;
    let consistentRows = 0;
    
    data.forEach(row => {
        const hasAllRequiredFields = headers.every(header => 
            row[header] && row[header].trim() !== ''
        );
        if (hasAllRequiredFields) consistentRows++;
    });
    
    return Math.round((consistentRows / data.length) * 100);
}

// Calculate data uniqueness
function calculateDataUniqueness(dataset) {
    const { data } = dataset;
    const uniqueRows = new Set(data.map(row => JSON.stringify(row))).length;
    return Math.round((uniqueRows / data.length) * 100);
}

// Infer data type
function inferDataType(values) {
    if (values.length === 0) return 'Unknown';
    
    const sample = values.slice(0, 100); // Check first 100 values
    const numericCount = sample.filter(v => !isNaN(v) && v.trim() !== '').length;
    const dateCount = sample.filter(v => !isNaN(Date.parse(v)) && v.trim() !== '').length;
    
    if (numericCount / sample.length > 0.8) return 'Numeric';
    if (dateCount / sample.length > 0.8) return 'Date';
    return 'Text';
}

// Calculate median
function calculateMedian(values) {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
        (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Calculate correlation matrix
function calculateCorrelationMatrix(columns, data) {
    const matrix = [];
    
    columns.forEach((col1, i) => {
        matrix[i] = [];
        const values1 = data.map(row => parseFloat(row[col1])).filter(v => !isNaN(v));
        
        columns.forEach((col2, j) => {
            if (i === j) {
                matrix[i][j] = 1.0;
            } else {
                const values2 = data.map(row => parseFloat(row[col2])).filter(v => !isNaN(v));
                matrix[i][j] = calculateCorrelation(values1, values2);
            }
        });
    });
    
    return matrix;
}

// Calculate correlation coefficient
function calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

// Display transaction summary
function displayTransactionSummary(dataset) {
    const summaryContainer = document.getElementById('transactionSummary');
    const { headers, data } = dataset;
    
    // Try to find amount-related columns
    const amountColumns = headers.filter(header => 
        header.toLowerCase().includes('amount') || 
        header.toLowerCase().includes('value') ||
        header.toLowerCase().includes('price') ||
        header.toLowerCase().includes('cost')
    );
    
    let totalTransactions = data.length;
    let averageAmount = 0;
    let totalAmount = 0;
    
    if (amountColumns.length > 0) {
        const amountColumn = amountColumns[0];
        const amounts = data.map(row => parseFloat(row[amountColumn])).filter(v => !isNaN(v));
        
        if (amounts.length > 0) {
            totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
            averageAmount = totalAmount / amounts.length;
        }
    }
    
    summaryContainer.innerHTML = `
        <div class="transaction-card">
            <h6>📊 Total Transactions</h6>
            <div class="transaction-value">${totalTransactions.toLocaleString()}</div>
            <div class="transaction-label">Records analyzed</div>
        </div>
        <div class="transaction-card">
            <h6>💰 Total Amount</h6>
            <div class="transaction-value">$${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="transaction-label">Sum of all transactions</div>
        </div>
        <div class="transaction-card">
            <h6>📈 Average Amount</h6>
            <div class="transaction-value">$${averageAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="transaction-label">Mean transaction value</div>
        </div>
    `;
}

// Display spending categories
function displaySpendingCategories(dataset) {
    const categoriesContainer = document.getElementById('spendingCategories');
    const { headers, data } = dataset;
    
    // Try to find category-related columns
    const categoryColumns = headers.filter(header => 
        header.toLowerCase().includes('category') || 
        header.toLowerCase().includes('type') ||
        header.toLowerCase().includes('merchant') ||
        header.toLowerCase().includes('description')
    );
    
    if (categoryColumns.length > 0) {
        const categoryColumn = categoryColumns[0];
        const amountColumn = headers.find(header => 
            header.toLowerCase().includes('amount') || 
            header.toLowerCase().includes('value')
        );
        
        // Group by category and calculate totals
        const categoryMap = new Map();
        
        data.forEach(row => {
            const category = row[categoryColumn] || 'Unknown';
            const amount = amountColumn ? parseFloat(row[amountColumn]) || 0 : 1;
            
            if (categoryMap.has(category)) {
                categoryMap.set(category, categoryMap.get(category) + amount);
            } else {
                categoryMap.set(category, amount);
            }
        });
        
        // Sort by amount and take top 6
        const sortedCategories = Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
        
        const totalAmount = sortedCategories.reduce((sum, [_, amount]) => sum + amount, 0);
        
        const categoriesHTML = sortedCategories.map(([category, amount]) => {
            const percentage = totalAmount > 0 ? (amount / totalAmount * 100).toFixed(1) : 0;
            return `
                <div class="category-card">
                    <h6>${category}</h6>
                    <div class="category-info">
                        <p><strong>Amount:</strong> $${amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p><strong>Percentage:</strong> ${percentage}%</p>
                        <div class="category-bar">
                            <div class="category-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        categoriesContainer.innerHTML = categoriesHTML;
    } else {
        // If no category column found, show generic analysis
        categoriesContainer.innerHTML = `
            <div class="category-card">
                <h6>📊 Data Overview</h6>
                <div class="category-info">
                    <p><strong>Total Records:</strong> ${data.length}</p>
                    <p><strong>Columns:</strong> ${headers.length}</p>
                    <p><strong>Data Types:</strong> Mixed (text, numeric, categorical)</p>
                </div>
            </div>
        `;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== LOGOUT MODAL FUNCTIONS =====

// Show logout confirmation modal
function showLogoutModal() {
    const modal = document.getElementById('logoutModal');
    modal.classList.add('active');
}

// Hide logout confirmation modal
function hideLogoutModal() {
    const modal = document.getElementById('logoutModal');
    modal.classList.remove('active');
}

// Cancel logout
function cancelLogout() {
    hideLogoutModal();
    console.log('Logout cancelled by user');
}

// Confirm logout
function confirmLogout() {
    console.log('Logging out...');
    // Clear user data from localStorage
    localStorage.removeItem('userFirstName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userMobile');
    localStorage.removeItem('userCountryCode');
    localStorage.removeItem('userLastName');
    // Redirect to landing page
    window.location.href = '../index.html';
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('logoutModal');
    if (event.target === modal) {
        hideLogoutModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideLogoutModal();
        hideProfileModal();
        closeSettingsModal();
    }
});

// ===== PROFILE MODAL FUNCTIONS =====

// Show profile modal
function showProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('active');
    loadProfileData();
}

// Hide profile modal
function hideProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('active');
}

// Close profile modal
function closeProfileModal() {
    hideProfileModal();
}

// Load profile data from localStorage (from login process)
function loadProfileData() {
    try {
        // Get user data from localStorage (stored during login)
        const firstName = localStorage.getItem('userFirstName') || 'User';
        const lastName = localStorage.getItem('userLastName') || '';
        const email = localStorage.getItem('userEmail') || 'user@example.com';
        const mobile = localStorage.getItem('userMobile') || '';
        const countryCode = localStorage.getItem('userCountryCode') || '';
        
        // Update profile display
        const fullName = `${firstName} ${lastName}`.trim();
        document.getElementById('profileFullName').textContent = fullName || 'User Name';
        document.getElementById('profileEmail').textContent = email;
        
        // Format phone number with country code
        const phone = countryCode && mobile ? 
            `+${countryCode} ${mobile}` : 
            (mobile || 'Not provided');
        document.getElementById('profileMobile').textContent = phone;
        
        console.log('Profile data loaded from localStorage:', { firstName, lastName, email, mobile, countryCode });
        
    } catch (error) {
        console.error('Error loading profile data:', error);
        loadFallbackProfileData();
    }
}

// Load fallback profile data when localStorage is not available
function loadFallbackProfileData() {
    const storedFirstName = localStorage.getItem('userFirstName');
    
    document.getElementById('profileFullName').textContent = storedFirstName || 'User Name';
    document.getElementById('profileEmail').textContent = 'user@example.com';
    document.getElementById('profileMobile').textContent = 'Not provided';
}



// ===== SETTINGS MODAL FUNCTIONS =====

// Show settings modal
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('active');
    loadSettings();
}

// Hide settings modal
function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
}

// Close settings modal
function closeSettingsModal() {
    hideSettingsModal();
}

// Load current settings (all disabled)
function loadSettings() {
    // Settings are currently inactive
    console.log('Settings are disabled');
}



// ===== SETTINGS FUNCTIONS (DISABLED) =====

// All settings are currently disabled
function showSettingsDisabled() {
    alert('Settings are currently inactive. Coming soon!');
}

// ===== NAVIGATION FUNCTIONS =====

// Initialize navigation system
function initializeNavigation() {
    // Show welcome page by default
    showPage('welcome');
}

// Show specific page and hide others
function showPage(pageName) {
    // Hide all pages
    const pages = [
        'welcomePage',
        'datasetAnalysisPage', 
        'modelPerformancePage',
        'transactionCheckPage',
        'transactionHistoryPage',
        'alertsInboxPage'
    ];
    
    pages.forEach(pageId => {
        const page = document.getElementById(pageId);
        if (page) {
            page.style.display = 'none';
        }
    });
    
    // Show selected page
    let targetPageId;
    switch(pageName) {
        case 'welcome':
            targetPageId = 'welcomePage';
            break;
        case 'datasetAnalysis':
            targetPageId = 'datasetAnalysisPage';
            break;
        case 'modelPerformance':
            targetPageId = 'modelPerformancePage';
            break;
        case 'transactionCheck':
            targetPageId = 'transactionCheckPage';
            break;
        case 'transactionHistory':
            targetPageId = 'transactionHistoryPage';
            break;
        case 'alertsInbox':
            targetPageId = 'alertsInboxPage';
            break;
        default:
            targetPageId = 'welcomePage';
    }
    
    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        // Scroll to top when changing pages
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    console.log(`Navigated to: ${pageName}`);

    // Trigger data loads based on page
    if (pageName === 'modelPerformance') {
        loadModelPerformance();
    } else if (pageName === 'transactionHistory') {
        loadTransactionHistory();
        // Render analytics and ROC on history page
        renderRocCurveFromMetrics();
        renderFraudVsLegit();
        renderFraudTrend();
        renderChannelFraudPie();
        renderAmountVsFraudScatter();
    } else if (pageName === 'alertsInbox') {
        loadAlertsInbox();
    }
}

// ===== TRANSACTION FORM FUNCTIONS =====

// Initialize transaction form
function initializeTransactionForm() {
    // Set current date and time as default
    const now = new Date();
    const dateTimeInput = document.getElementById('transactionDateTime');
    
    if (dateTimeInput) {
        // Format datetime-local input value (YYYY-MM-DDTHH:MM)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        dateTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// Check transaction: call backend API and display result; also persists to DB via API
async function checkTransaction() {
    try {
        const amountEl = document.getElementById('transactionAmount');
        const kycEl = document.getElementById('kycVerified');
        const ageEl = document.getElementById('accountAge');
        const channelEl = document.getElementById('channel');
        const dtEl = document.getElementById('transactionDateTime');

        if (!amountEl || !kycEl || !ageEl || !channelEl || !dtEl) {
            alert('Form is incomplete on the page.');
            return;
        }

        const amount = parseFloat(amountEl.value);
        const kyc = kycEl.value;
        const ageDays = parseInt(ageEl.value, 10);
        const channel = channelEl.value;
        const dtValue = dtEl.value; // format: YYYY-MM-DDTHH:MM
        if (!amount || !kyc || !ageDays || !channel || !dtValue) {
            alert('Please fill all fields correctly.');
            return;
        }

        // Derive or generate a customer_id (user should not input this)
        const storedEmail = (localStorage.getItem('userEmail') || '').trim();
        const storedFirst = (localStorage.getItem('userFirstName') || '').trim();
        const base = (storedEmail ? storedEmail.split('@')[0] : '') || storedFirst || 'guest';
        const customerId = `${base}-${Math.random().toString(36).slice(2, 8)}`;

        const date = new Date(dtValue);
        const payload = {
            transaction_id: 'temp', // server will overwrite with UUID
            customer_id: customerId,
            kyc_verified: kyc,
            account_age_days: ageDays,
            transaction_amount: amount,
            channel: channel,
            timestamp: date.toISOString(),
            is_fraud: '0',
            hour: date.getHours(),
            day: date.getDate(),
            month: date.getMonth() + 1,
            weekday: date.getDay(),
            is_high_value: amount >= 1000 ? 1 : 0
        };
        // remember for explainability
        lastPredictionPayload = payload;

        // Call /predict for combined prediction + rule-based details and persistence
        const res = await fetch(`${API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Request failed with ${res.status}`);
        }
        const data = await res.json();

        // Show result section (cards + reason + table)
        const resultEl = document.getElementById('transactionResult');
        const statusTextEl = resultEl?.querySelector('.result-status');
        const descEl = resultEl?.querySelector('.result-description');
        const riskEl = resultEl?.querySelector('.result-risk');
        const iconEl = resultEl?.querySelector('.result-icon i');
        const tableTx = document.getElementById('res_tx_id');
        const tablePred = document.getElementById('res_prediction');
        const tableRisk = document.getElementById('res_risk');
        const tableReason = document.getElementById('res_reason');
        const tableTs = document.getElementById('res_timestamp');

        if (resultEl && statusTextEl && descEl && iconEl) {
            const label = String(data.prediction || '').toLowerCase();
            const isFraud = label === 'fraud' || label === 'fraudulent' || data.prediction === 1;
            const risk = Number(data.risk_score ?? 0);
            resultEl.style.display = 'block';
            statusTextEl.textContent = isFraud ? 'Fraudulent Transaction' : 'Legitimate Transaction';
            descEl.textContent = data.reason || (isFraud ? 'High risk' : 'No anomalies detected');
            if (riskEl) riskEl.textContent = risk.toFixed(2);
            iconEl.className = isFraud ? 'bx bxs-shield-x' : 'bx bxs-shield-check';

            // Fill result table
            if (tableTx) tableTx.textContent = formatId(data.transaction_id, 'txn');
            if (tablePred) tablePred.textContent = isFraud ? 'Fraud' : 'Legit';
            if (tableRisk) tableRisk.textContent = risk.toFixed(2);
            if (tableReason) tableReason.textContent = data.reason || '-';
            if (tableTs) tableTs.textContent = payload.timestamp;

            // Fetch LLM explanation from backend (Gemini) and update UI
            try {
                if (data.transaction_id) {
                    // Indicate that an explanation is being generated
                    descEl.textContent = 'Generating explanation...';
                    const explainRes = await fetch(`${API_BASE}/api/llm-explain/${encodeURIComponent(data.transaction_id)}`);
                    if (explainRes.ok) {
                        const explain = await explainRes.json();
                        if (explain && explain.explanation) {
                            // Show Gemini-generated explanation in the description area
                            descEl.textContent = explain.explanation;
                        } else {
                            // Fallback to rule-based reason
                            descEl.textContent = data.reason || descEl.textContent;
                        }
                        // Keep the table reason as raw rule-based reason when available
                        if (tableReason && explain && explain.raw_reason) {
                            tableReason.textContent = explain.raw_reason;
                        }
                    } else {
                        // Fallback on failure
                        descEl.textContent = data.reason || 'Explanation service unavailable';
                    }
                }
            } catch (err) {
                console.error('LLM explanation error:', err);
                descEl.textContent = data.reason || 'Explanation error';
            }
        }

        // Append to history table UI
        appendHistoryRow({
            customer_id: formatId(payload.customer_id, 'cust'),
            transaction_amount: amount.toFixed(2),
            kyc_verified: kyc,
            account_age_days: ageDays,
            channel: channel,
            timestamp: date.toLocaleString(),
            is_fraud: (String(data.prediction || '').toLowerCase() === 'fraud' || data.prediction === 1) ? 1 : 0
        });

        alert('Transaction evaluated successfully.');
    } catch (e) {
        console.error('checkTransaction error:', e);
        alert(`Error: ${e.message}`);
    }
}

// Transaction form functions removed - button is non-functional as requested

// ===== TRANSACTION HISTORY FUNCTIONS =====

// Load transaction history (placeholder for future implementation)
async function loadTransactionHistory() {
    try {
        // Fetch a sufficiently large limit to show all recent transactions
        const res = await fetch(`${API_BASE}/api/transactions?limit=10000`);
        const data = await res.json();
        if (!Array.isArray(data)) {
            console.log('No transactions found');
            renderEmptyHistory();
            return;
        }
        const body = document.getElementById('historyTableBody');
        if (!body) return;
        body.innerHTML = '';
        if (data.length === 0) {
            renderEmptyHistory();
            return;
        }
        data.forEach(tx => {
            appendHistoryRow({
                customer_id: tx.customer_id || '-',
                transaction_amount: tx.transaction_amount,
                kyc_verified: tx.kyc_verified,
                account_age_days: tx.account_age_days,
                channel: tx.channel,
                timestamp: tx.timestamp,
                is_fraud: tx.is_fraud
            });
        });
    } catch (e) {
        console.error('Failed to load history', e);
        renderEmptyHistory();
    }
}

function renderEmptyHistory() {
    const body = document.getElementById('historyTableBody');
    if (!body) return;
    body.innerHTML = `
        <tr class="no-data">
            <td colspan="7">
                <div class="no-data-message">
                    <i class='bx bxs-inbox'></i>
                    <p>No transactions checked yet</p>
                    <span>Check some transactions to see them appear here</span>
                </div>
            </td>
        </tr>
    `;
}

function appendHistoryRow(row) {
    const body = document.getElementById('historyTableBody');
    if (!body) return;
    // Remove placeholder row
    const placeholder = body.querySelector('.no-data');
    if (placeholder) placeholder.remove();
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${row.customer_id ?? '-'}</td>
        <td>${row.transaction_amount ?? '-'}</td>
        <td>${row.kyc_verified ?? '-'}</td>
        <td>${row.account_age_days ?? '-'}</td>
        <td>${row.channel ?? '-'}</td>
        <td>${row.timestamp ?? '-'}</td>
        <td>${row.is_fraud}</td>
    `;
    body.appendChild(tr);
}

// Clear all transactions from history
function clearTransactionHistory() {
    if (!confirm('Are you sure you want to clear all transaction history? This action cannot be undone.')) return;

    // Call backend to clear persisted data
    fetch(`${API_BASE}/api/transactions`, { method: 'DELETE' })
        .then(async (res) => {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Failed to delete (status ${res.status})`);
            }
            // Reset table UI
            const historyBody = document.getElementById('historyTableBody');
            if (historyBody) {
                historyBody.innerHTML = `
                    <tr class="no-data">
                        <td colspan="7">
                            <div class="no-data-message">
                                <i class='bx bxs-inbox'></i>
                                <p>No transactions checked yet</p>
                                <span>Check some transactions to see them appear here</span>
                            </div>
                        </td>
                    </tr>
                `;
            }

            // Destroy charts so visuals reset immediately
            try {
                destroyChartIfExists('roc');
                destroyChartIfExists('fraudVsLegit');
                destroyChartIfExists('fraudTrend');
                destroyChartIfExists('channelPie');
                destroyChartIfExists('amountScatter');
            } catch (e) { console.warn('Chart cleanup failed', e); }

            alert('All transaction history has been cleared.');
        })
        .catch((e) => {
            console.error('Delete history error:', e);
            alert(`Failed to clear history: ${e.message}`);
        });
}

// Download transaction history as Excel file
function downloadTransactionHistory() {
    const historyBody = document.getElementById('historyTableBody');
    if (!historyBody) return;
    
    // Check if there are any transactions
    const rows = historyBody.querySelectorAll('tr:not(.no-data)');
    if (rows.length === 0) {
        alert('No transaction history available to download.');
        return;
    }
    
    // Prepare data for Excel
    const data = [];
    
    // Add headers
    data.push([
        'Customer ID',
        'Transaction Amount',
        'KYC Verified',
        'Account Age (Days)',
        'Channel',
        'Date & Time',
        'is_fraud'
    ]);
    
    // Add transaction data
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const rowData = [
                cells[0].textContent.trim(),
                cells[1].textContent.trim(),
                cells[2].textContent.trim(),
                cells[3].textContent.trim(),
                cells[4].textContent.trim(),
                cells[5].textContent.trim(),
                cells[6].textContent.trim()
            ];
            data.push(rowData);
        }
    });
    
    // Create Excel file
    createExcelFile(data, 'Transaction_History.xlsx');
    console.log('Transaction history downloaded as Excel file');
}

// Create and download Excel file
function createExcelFile(data, filename) {
    // Create a simple CSV-like format that Excel can open
    let csvContent = '';
    
    data.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Add BOM for UTF-8 to ensure proper encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
}

// ===== MODEL PERFORMANCE FUNCTIONS =====

// Load model performance metrics from backend
async function loadModelPerformance() {
    try {
        const res = await fetch(`${API_BASE}/api/model-info`);
        if (!res.ok) {
            throw new Error('Failed to load model metrics');
        }
        const metrics = await res.json();
        updatePerformanceMetrics(metrics);
        fillConfusionMatrixTable(metrics);
    } catch (e) {
        console.error('Failed to load model performance:', e);
        alert('Could not load model performance metrics. Ensure the model is trained and server is running.');
    }
}

// Update performance metrics display
function updatePerformanceMetrics(metrics) {
    const table = document.querySelector('.performance-table tbody');
    if (!table) return;

    // Normalize keys from backend (snake_case) to expected mapping
    // Fallback compute specificity from confusion matrix if missing
    let specificityVal = metrics.specificity;
    if (typeof specificityVal !== 'number' && Array.isArray(metrics.confusion_matrix)) {
        try {
            const cm = metrics.confusion_matrix;
            const tn = cm[0][0];
            const fp = cm[0][1];
            specificityVal = (tn + fp) > 0 ? tn / (tn + fp) : 0;
        } catch {}
    }

    const valueMap = {
        accuracy: Number(metrics.accuracy),
        precision: Number(metrics.precision),
        recall: Number(metrics.recall),
        'f1-score': Number(metrics.f1_score),
        specificity: Number(specificityVal),
        auc: Number(metrics.auc_score)
    };

    const rows = table.querySelectorAll('tr');
    const ordered = [
        ['Accuracy', 'accuracy'],
        ['Precision', 'precision'],
        ['F1-Score', 'f1-score'],
        ['Recall', 'recall'],
        ['Specificity', 'specificity'],
        ['AUC Score', 'auc']
    ];

    rows.forEach((row, idx) => {
        const key = ordered[idx]?.[1];
        if (!key) return;
        const val = valueMap[key];
        const valueCell = row.querySelector('.metric-value');
        const statusBadge = row.querySelector('.status-badge');
        if (valueCell && typeof val === 'number') {
            // AUC isn't a percentage per se, but display as percentage for consistency
            valueCell.textContent = (val * 100).toFixed(2) + '%';
        }
        if (statusBadge && typeof val === 'number') {
            statusBadge.textContent = 'Completed';
            statusBadge.className = 'status-badge completed';
        }
    });
}

// Fill Confusion Matrix table counts
function fillConfusionMatrixTable(metrics) {
    const cm = metrics?.confusion_matrix;
    const tnEl = document.getElementById('cm_tn');
    const fpEl = document.getElementById('cm_fp');
    const fnEl = document.getElementById('cm_fn');
    const tpEl = document.getElementById('cm_tp');
    if (!cm || !tnEl || !fpEl || !fnEl || !tpEl) return;
    try {
        tnEl.textContent = cm[0][0];
        fpEl.textContent = cm[0][1];
        fnEl.textContent = cm[1][0];
        tpEl.textContent = cm[1][1];
    } catch (e) { console.warn('Invalid confusion matrix format', e); }
}

// ===== CHART RENDERERS =====

function destroyChartIfExists(key) {
    if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
    }
}

// Removed confusion matrix chart in favor of table

// Render ROC Curve from metrics fetched separately because it's shown in history page
async function renderRocCurveFromMetrics() {
    const canvas = document.getElementById('rocCurveChart');
    if (!canvas) return;
    destroyChartIfExists('roc');
    try {
        const res = await fetch(`${API_BASE}/api/model-info`);
        if (!res.ok) return;
        const metrics = await res.json();
        const fpr = (metrics.roc_curve?.fpr) || [];
        const tpr = (metrics.roc_curve?.tpr) || [];
        const auc = Number(metrics.auc_score) || 0;
    charts.roc = new Chart(canvas, {
        type: 'line',
        data: {
            labels: fpr,
            datasets: [
                { label: `ROC (AUC ${auc.toFixed(4)})`, data: tpr, borderColor: '#3e95cd', fill: false },
                { label: 'Baseline', data: fpr.map(x => x), borderColor: '#cccccc', borderDash: [5, 5], fill: false }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { x: { title: { display: true, text: 'False Positive Rate' } }, y: { title: { display: true, text: 'True Positive Rate' }, min: 0, max: 1 } }
        }
    });
    } catch (e) { console.error('ROC chart render error', e); }
}

async function renderFraudVsLegit() {
    const canvas = document.getElementById('fraudVsLegitChart');
    if (!canvas) return;
    destroyChartIfExists('fraudVsLegit');
    try {
        const res = await fetch(`${API_BASE}/api/fraud-stats`);
        const stats = await res.json();
        if (!stats || stats.message) return;
        const data = [stats.fraud_transactions || 0, stats.legit_transactions || 0];
        charts.fraudVsLegit = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: ['Fraud', 'Legit'],
                datasets: [{ data, backgroundColor: ['#e74c3c', '#2ecc71'] }]
            },
            options: { responsive: true }
        });
    } catch (e) { console.error('Fraud vs Legit chart error', e); }
}

async function renderFraudTrend() {
    const canvas = document.getElementById('fraudTrendChart');
    if (!canvas) return;
    destroyChartIfExists('fraudTrend');
    try {
        const res = await fetch(`${API_BASE}/api/analytics/timeseries`);
        const series = await res.json();
        if (!Array.isArray(series) || series.length === 0) return;

        const labels = series.map(r => r.transaction_date);
        const fraudCounts = series.map(r => Number(r.fraud_count || 0));
        const totalCounts = series.map(r => Number(r.total_count || 0));
        const legitCounts = totalCounts.map((t, i) => Math.max(0, t - fraudCounts[i]));
        const fraudPercents = series.map(r => Number(r.fraud_percentage || 0));

        charts.fraudTrend = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Legit Count',
                        data: legitCounts,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        stack: 'counts'
                    },
                    {
                        type: 'bar',
                        label: 'Fraud Count',
                        data: fraudCounts,
                        backgroundColor: 'rgba(231, 76, 60, 0.8)',
                        stack: 'counts'
                    },
                    {
                        type: 'line',
                        label: 'Fraud %',
                        data: fraudPercents,
                        borderColor: '#f39c12',
                        backgroundColor: '#f39c12',
                        yAxisID: 'y1',
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, title: { display: true, text: 'Transactions' } },
                    y1: { position: 'right', min: 0, max: 100, title: { display: true, text: 'Fraud %' }, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { position: 'top' } }
            }
        });
    } catch (e) { console.error('Fraud trend chart error', e); }
}

async function renderChannelFraudPie() {
    const canvas = document.getElementById('channelFraudPie');
    if (!canvas) return;
    destroyChartIfExists('channelPie');
    try {
        const res = await fetch(`${API_BASE}/api/analytics/channels`);
        const rows = await res.json();
        if (!Array.isArray(rows)) return;
        const labels = rows.map(r => {
            const s = (r.channel || '').toString();
            return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        });
        const values = rows.map(r => Number(r.fraud_percentage ?? 0));
        charts.channelPie = new Chart(canvas, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [{ 
                    label: 'Fraud %', 
                    data: values, 
                    backgroundColor: '#9b59b6' 
                }] 
            },
            options: { responsive: true, scales: { y: { min: 0, max: 100, title: { display: true, text: 'Fraud %' } } } }
        });
    } catch (e) { console.error('Channel pie chart error', e); }
}

async function renderAmountVsFraudScatter() {
    const canvas = document.getElementById('amountVsFraudScatter');
    if (!canvas) return;
    destroyChartIfExists('amountScatter');
    try {
        const res = await fetch(`${API_BASE}/api/analytics/amount_vs_fraud`);
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) return;

        // Prepare amounts
        const amounts = rows
            .map(r => Number(r.transaction_amount))
            .filter(v => Number.isFinite(v));
        if (amounts.length === 0) return;

        const minA = Math.min(...amounts);
        const maxA = Math.max(...amounts);
        if (minA === maxA) {
            // Degenerate case: all same amount
            const labels = [`${minA.toFixed(2)}`];
            const fraudCount = rows.filter(r => r.is_fraud === 1).length;
            const legitCount = rows.filter(r => r.is_fraud === 0).length;
            charts.amountScatter = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Legit', data: [legitCount], backgroundColor: 'rgba(46, 204, 113, 0.6)' },
                        { label: 'Fraud', data: [fraudCount], backgroundColor: 'rgba(231, 76, 60, 0.7)' }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
            });
            return;
        }

        // Build histogram bins
        const BIN_COUNT = 20;
        const binWidth = (maxA - minA) / BIN_COUNT;
        const edges = Array.from({ length: BIN_COUNT + 1 }, (_, i) => minA + i * binWidth);
        const labels = Array.from({ length: BIN_COUNT }, (_, i) => {
            const lo = edges[i];
            const hi = edges[i + 1];
            return `${lo.toFixed(2)}–${hi.toFixed(2)}`;
        });
        const histLegit = Array(BIN_COUNT).fill(0);
        const histFraud = Array(BIN_COUNT).fill(0);

        for (const r of rows) {
            const a = Number(r.transaction_amount);
            if (!Number.isFinite(a)) continue;
            let idx = Math.floor((a - minA) / (maxA - minA) * BIN_COUNT);
            if (idx < 0) idx = 0;
            if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
            if (Number(r.is_fraud) === 1) histFraud[idx] += 1; else histLegit[idx] += 1;
        }

        charts.amountScatter = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Legit',
                        data: histLegit,
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Fraud',
                        data: histFraud,
                        backgroundColor: 'rgba(231, 76, 60, 0.5)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' }, tooltip: { callbacks: { title: items => `Amount bin: ${items[0]?.label}` } } },
                scales: {
                    x: { title: { display: true, text: 'Transaction Amount (binned)' }, stacked: false },
                    y: { title: { display: true, text: 'Count' }, beginAtZero: true }
                }
            }
        });
    } catch (e) { console.error('Amount vs Fraud scatter error', e); }
}

// ===== INITIALIZATION =====


