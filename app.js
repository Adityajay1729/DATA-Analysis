// Global state
let rawData = [];
let columns = [];
let currentData = [];
let charts = {};

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        const section = item.getAttribute('data-section');
        document.getElementById(section).classList.add('active');
        
        // Update dropdowns when switching sections
        if (columns.length > 0) {
            updateDropdowns();
        }
    });
});

// File upload
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
});

function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        parseCSV(text);
    };
    reader.readAsText(file);
}

function parsePastedData() {
    const text = document.getElementById('pasteData').value;
    if (!text.trim()) {
        showStatus('uploadStatus', 'Please paste some data first', 'error');
        return;
    }
    parseCSV(text);
}

function parseCSV(text) {
    Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
            if (results.data.length === 0) {
                showStatus('uploadStatus', 'No data found in file', 'error');
                return;
            }
            rawData = results.data;
            currentData = JSON.parse(JSON.stringify(rawData));
            columns = Object.keys(rawData[0]);
            showStatus('uploadStatus', `Successfully loaded ${rawData.length} rows and ${columns.length} columns`, 'success');
            updateDropdowns();
            generateOverview();
        },
        error: (error) => {
            showStatus('uploadStatus', `Error parsing file: ${error.message}`, 'error');
        }
    });
}

function updateDropdowns() {
    const numericCols = getNumericColumns();
    const allCols = columns;
    
    // Update all dropdowns
    const dropdowns = [
        'histColumn', 'statsColumn', 'regressionX', 'regressionY',
        'kmeansX', 'kmeansY', 'transformColumn', 'scatterX', 'scatterY',
        'boxColumn', 'imputeColumn', 'sqlOrderBy', 'pivotRow', 'pivotCol',
        'pivotValue', 'forecastIndex', 'forecastValue', 'mergeCol1', 'mergeCol2',
        'splitCol', 'dtTarget', 'dtFeatures', 'tsCol'
    ];
    
    dropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '';
            const cols = ['regressionX', 'regressionY', 'kmeansX', 'kmeansY', 
                         'statsColumn', 'transformColumn', 'scatterX', 'scatterY',
                         'boxColumn', 'pivotValue', 'forecastValue'].includes(id) ? numericCols : allCols;
            cols.forEach(col => {
                const option = document.createElement('option');
                option.value = col;
                option.textContent = col;
                select.appendChild(option);
            });
        }
    });
}

function getNumericColumns() {
    if (currentData.length === 0) return [];
    return columns.filter(col => {
        const val = currentData[0][col];
        return typeof val === 'number' && !isNaN(val);
    });
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

// Overview
function generateOverview() {
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-value">${currentData.length}</div>
            <div class="stat-label">Total Rows</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${columns.length}</div>
            <div class="stat-label">Total Columns</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${getNumericColumns().length}</div>
            <div class="stat-label">Numeric Columns</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${countMissingValues()}</div>
            <div class="stat-label">Missing Values</div>
        </div>
    `;
    document.getElementById('overviewStats').innerHTML = statsHtml;
    
    // Preview table
    const previewData = currentData.slice(0, 10);
    let tableHtml = '<thead><tr>';
    columns.forEach(col => {
        tableHtml += `<th>${col}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    previewData.forEach(row => {
        tableHtml += '<tr>';
        columns.forEach(col => {
            tableHtml += `<td>${row[col] ?? 'N/A'}</td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
    document.getElementById('previewTable').innerHTML = tableHtml;
}

function countMissingValues() {
    let count = 0;
    currentData.forEach(row => {
        columns.forEach(col => {
            if (row[col] === null || row[col] === undefined || row[col] === '') count++;
        });
    });
    return count;
}

// Visualizations
function generateHistogram() {
    const col = document.getElementById('histColumn').value;
    const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
    
    if (values.length === 0) {
        alert('No valid numeric data in selected column');
        return;
    }
    
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    const labels = [];
    
    for (let i = 0; i < bins; i++) {
        labels.push(`${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`);
    }
    
    values.forEach(v => {
        let binIndex = Math.floor((v - min) / binSize);
        if (binIndex === bins) binIndex = bins - 1;
        histogram[binIndex]++;
    });
    
    if (charts.histogram) charts.histogram.destroy();
    const ctx = document.getElementById('histChart').getContext('2d');
    charts.histogram = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: col,
                data: histogram,
                backgroundColor: '#1FB8CD'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Frequency' }
                },
                x: {
                    title: { display: true, text: 'Value Range' }
                }
            }
        }
    });
}

function calculateCorrelations() {
    const numCols = getNumericColumns();
    if (numCols.length < 2) {
        document.getElementById('correlationResults').innerHTML = '<div class="alert alert-error">Need at least 2 numeric columns</div>';
        return;
    }
    
    const correlations = [];
    for (let i = 0; i < numCols.length; i++) {
        for (let j = i + 1; j < numCols.length; j++) {
            const corr = correlation(numCols[i], numCols[j]);
            correlations.push({ col1: numCols[i], col2: numCols[j], corr: corr });
        }
    }
    
    correlations.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
    
    let html = '<div class="stats-grid">';
    correlations.slice(0, 6).forEach(c => {
        html += `
            <div class="stat-card">
                <div class="stat-value">${c.corr.toFixed(3)}</div>
                <div class="stat-label">${c.col1} vs ${c.col2}</div>
            </div>
        `;
    });
    html += '</div>';
    document.getElementById('correlationResults').innerHTML = html;
}

function correlation(col1, col2) {
    const data1 = currentData.map(row => row[col1]).filter(v => v !== null && !isNaN(v));
    const data2 = currentData.map(row => row[col2]).filter(v => v !== null && !isNaN(v));
    
    const n = Math.min(data1.length, data2.length);
    const mean1 = data1.reduce((a, b) => a + b, 0) / n;
    const mean2 = data2.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
        const diff1 = data1[i] - mean1;
        const diff2 = data2[i] - mean2;
        num += diff1 * diff2;
        den1 += diff1 * diff1;
        den2 += diff2 * diff2;
    }
    
    return num / Math.sqrt(den1 * den2);
}

// Statistics
function calculateStatistics() {
    const col = document.getElementById('statsColumn').value;
    const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
    
    if (values.length === 0) {
        document.getElementById('statsResults').innerHTML = '<div class="alert alert-error">No valid numeric data</div>';
        return;
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${mean.toFixed(2)}</div><div class="stat-label">Mean</div></div>
            <div class="stat-card"><div class="stat-value">${median.toFixed(2)}</div><div class="stat-label">Median</div></div>
            <div class="stat-card"><div class="stat-value">${stdDev.toFixed(2)}</div><div class="stat-label">Std Dev</div></div>
            <div class="stat-card"><div class="stat-value">${variance.toFixed(2)}</div><div class="stat-label">Variance</div></div>
            <div class="stat-card"><div class="stat-value">${min.toFixed(2)}</div><div class="stat-label">Min</div></div>
            <div class="stat-card"><div class="stat-value">${max.toFixed(2)}</div><div class="stat-label">Max</div></div>
            <div class="stat-card"><div class="stat-value">${q1.toFixed(2)}</div><div class="stat-label">Q1</div></div>
            <div class="stat-card"><div class="stat-value">${q3.toFixed(2)}</div><div class="stat-label">Q3</div></div>
            <div class="stat-card"><div class="stat-value">${iqr.toFixed(2)}</div><div class="stat-label">IQR</div></div>
            <div class="stat-card"><div class="stat-value">${outliers.length}</div><div class="stat-label">Outliers</div></div>
        </div>
    `;
    document.getElementById('statsResults').innerHTML = html;
}

// Machine Learning
function runLinearRegression() {
    const xCol = document.getElementById('regressionX').value;
    const yCol = document.getElementById('regressionY').value;
    
    const data = currentData.filter(row => 
        row[xCol] !== null && !isNaN(row[xCol]) && 
        row[yCol] !== null && !isNaN(row[yCol])
    );
    
    if (data.length < 2) {
        document.getElementById('regressionResults').innerHTML = '<div class="alert alert-error">Need at least 2 valid data points</div>';
        return;
    }
    
    const x = data.map(row => row[xCol]);
    const y = data.map(row => row[yCol]);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const predictions = x.map(xi => slope * xi + intercept);
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
    const r2 = 1 - (ssResidual / ssTotal);
    
    document.getElementById('regressionResults').innerHTML = `
        <div class="result-box">
            <h4>Regression Results</h4>
            <p><strong>Equation:</strong> y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}</p>
            <p><strong>R² Score:</strong> ${r2.toFixed(4)}</p>
            <p><strong>Slope:</strong> ${slope.toFixed(4)}</p>
            <p><strong>Intercept:</strong> ${intercept.toFixed(4)}</p>
        </div>
    `;
    
    if (charts.regression) charts.regression.destroy();
    const ctx = document.getElementById('regressionChart').getContext('2d');
    charts.regression = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Actual Data',
                    data: x.map((xi, i) => ({ x: xi, y: y[i] })),
                    backgroundColor: '#1FB8CD'
                },
                {
                    label: 'Regression Line',
                    data: x.map(xi => ({ x: xi, y: slope * xi + intercept })),
                    type: 'line',
                    borderColor: '#B4413C',
                    backgroundColor: 'transparent',
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: xCol } },
                y: { title: { display: true, text: yCol } }
            }
        }
    });
}

function runKMeans() {
    const xCol = document.getElementById('kmeansX').value;
    const yCol = document.getElementById('kmeansY').value;
    const k = parseInt(document.getElementById('kmeansK').value);
    
    const data = currentData.filter(row => 
        row[xCol] !== null && !isNaN(row[xCol]) && 
        row[yCol] !== null && !isNaN(row[yCol])
    ).map(row => [row[xCol], row[yCol]]);
    
    if (data.length < k) {
        document.getElementById('kmeansResults').innerHTML = '<div class="alert alert-error">Not enough data points for clustering</div>';
        return;
    }
    
    const { clusters, centroids } = kMeansClustering(data, k);
    
    document.getElementById('kmeansResults').innerHTML = `
        <div class="result-box">
            <h4>Clustering Results</h4>
            <p><strong>Clusters:</strong> ${k}</p>
            <p><strong>Data Points:</strong> ${data.length}</p>
            ${centroids.map((c, i) => `<p><strong>Centroid ${i + 1}:</strong> (${c[0].toFixed(2)}, ${c[1].toFixed(2)})</p>`).join('')}
        </div>
    `;
    
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
    const datasets = [];
    for (let i = 0; i < k; i++) {
        datasets.push({
            label: `Cluster ${i + 1}`,
            data: data.filter((_, idx) => clusters[idx] === i).map(point => ({ x: point[0], y: point[1] })),
            backgroundColor: colors[i % colors.length]
        });
    }
    
    if (charts.kmeans) charts.kmeans.destroy();
    const ctx = document.getElementById('kmeansChart').getContext('2d');
    charts.kmeans = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: xCol } },
                y: { title: { display: true, text: yCol } }
            }
        }
    });
}

function kMeansClustering(data, k) {
    let centroids = data.slice(0, k).map(d => [...d]);
    let clusters = new Array(data.length);
    let changed = true;
    let iterations = 0;
    
    while (changed && iterations < 100) {
        changed = false;
        iterations++;
        
        // Assign clusters
        for (let i = 0; i < data.length; i++) {
            let minDist = Infinity;
            let cluster = 0;
            for (let j = 0; j < k; j++) {
                const dist = Math.sqrt(
                    Math.pow(data[i][0] - centroids[j][0], 2) + 
                    Math.pow(data[i][1] - centroids[j][1], 2)
                );
                if (dist < minDist) {
                    minDist = dist;
                    cluster = j;
                }
            }
            if (clusters[i] !== cluster) {
                clusters[i] = cluster;
                changed = true;
            }
        }
        
        // Update centroids
        for (let j = 0; j < k; j++) {
            const clusterPoints = data.filter((_, i) => clusters[i] === j);
            if (clusterPoints.length > 0) {
                centroids[j] = [
                    clusterPoints.reduce((sum, p) => sum + p[0], 0) / clusterPoints.length,
                    clusterPoints.reduce((sum, p) => sum + p[1], 0) / clusterPoints.length
                ];
            }
        }
    }
    
    return { clusters, centroids };
}

// Transform
function applyTransformation() {
    const col = document.getElementById('transformColumn').value;
    const method = document.getElementById('transformMethod').value;
    
    const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) {
        document.getElementById('transformResults').innerHTML = '<div class="alert alert-error">No valid numeric data</div>';
        return;
    }
    
    let transformed;
    if (method === 'minmax') {
        const min = Math.min(...values);
        const max = Math.max(...values);
        transformed = values.map(v => (v - min) / (max - min));
    } else {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
        transformed = values.map(v => (v - mean) / stdDev);
    }
    
    const newColName = `${col}_${method}`;
    let idx = 0;
    currentData.forEach(row => {
        if (row[col] !== null && !isNaN(row[col])) {
            row[newColName] = transformed[idx++];
        }
    });
    
    columns.push(newColName);
    updateDropdowns();
    
    document.getElementById('transformResults').innerHTML = `
        <div class="alert alert-success">Successfully applied ${method} transformation. New column: ${newColName}</div>
        <div class="result-box">
            <h4>Sample Transformed Values</h4>
            <table>
                <thead><tr><th>Original</th><th>Transformed</th></tr></thead>
                <tbody>
                    ${values.slice(0, 10).map((v, i) => `<tr><td>${v.toFixed(4)}</td><td>${transformed[i].toFixed(4)}</td></tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Advanced Charts
function generateScatterPlot() {
    const xCol = document.getElementById('scatterX').value;
    const yCol = document.getElementById('scatterY').value;
    
    const data = currentData.filter(row => 
        row[xCol] !== null && !isNaN(row[xCol]) && 
        row[yCol] !== null && !isNaN(row[yCol])
    );
    
    const x = data.map(row => row[xCol]);
    const y = data.map(row => row[yCol]);
    
    // Calculate trend line
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    if (charts.scatter) charts.scatter.destroy();
    const ctx = document.getElementById('scatterChart').getContext('2d');
    charts.scatter = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Data Points',
                    data: x.map((xi, i) => ({ x: xi, y: y[i] })),
                    backgroundColor: '#1FB8CD'
                },
                {
                    label: 'Trend Line',
                    data: x.map(xi => ({ x: xi, y: slope * xi + intercept })),
                    type: 'line',
                    borderColor: '#B4413C',
                    backgroundColor: 'transparent',
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: xCol } },
                y: { title: { display: true, text: yCol } }
            }
        }
    });
}

function generateBoxPlot() {
    const col = document.getElementById('boxColumn').value;
    const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
    const sorted = [...values].sort((a, b) => a - b);
    
    const min = sorted[0];
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const max = sorted[sorted.length - 1];
    
    if (charts.box) charts.box.destroy();
    const ctx = document.getElementById('boxChart').getContext('2d');
    charts.box = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Box Plot'],
            datasets: [{
                label: col,
                data: [{ x: 'Box Plot', y: [min, q1, median, q3, max] }],
                backgroundColor: '#1FB8CD'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return [
                                `Min: ${min.toFixed(2)}`,
                                `Q1: ${q1.toFixed(2)}`,
                                `Median: ${median.toFixed(2)}`,
                                `Q3: ${q3.toFixed(2)}`,
                                `Max: ${max.toFixed(2)}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

function generateHeatmap() {
    const numCols = getNumericColumns();
    if (numCols.length < 2) {
        document.getElementById('heatmapContainer').innerHTML = '<div class="alert alert-error">Need at least 2 numeric columns</div>';
        return;
    }
    
    let html = '<table style="margin-top: 16px;"><thead><tr><th></th>';
    numCols.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';
    
    numCols.forEach(col1 => {
        html += `<tr><th>${col1}</th>`;
        numCols.forEach(col2 => {
            const corr = correlation(col1, col2);
            const intensity = Math.abs(corr);
            const color = corr > 0 ? 
                `rgba(33, 128, 141, ${intensity})` : 
                `rgba(192, 21, 47, ${intensity})`;
            html += `<td style="background: ${color}; text-align: center; color: white;">${corr.toFixed(2)}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('heatmapContainer').innerHTML = html;
}

// Data Cleaning
function analyzeDataQuality() {
    const missing = {};
    const duplicates = [];
    const seen = new Set();
    
    columns.forEach(col => missing[col] = 0);
    
    currentData.forEach((row, idx) => {
        const rowStr = JSON.stringify(row);
        if (seen.has(rowStr)) {
            duplicates.push(idx);
        } else {
            seen.add(rowStr);
        }
        
        columns.forEach(col => {
            if (row[col] === null || row[col] === undefined || row[col] === '') {
                missing[col]++;
            }
        });
    });
    
    let html = '<h3>Missing Values by Column</h3><div class="stats-grid">';
    Object.entries(missing).forEach(([col, count]) => {
        const percent = ((count / currentData.length) * 100).toFixed(1);
        html += `<div class="stat-card"><div class="stat-value">${count}</div><div class="stat-label">${col} (${percent}%)</div></div>`;
    });
    html += '</div>';
    html += `<div class="result-box mt-16"><h4>Duplicate Rows</h4><p><strong>Count:</strong> ${duplicates.length}</p></div>`;
    
    document.getElementById('qualityResults').innerHTML = html;
}

function imputeMissingValues() {
    const col = document.getElementById('imputeColumn').value;
    const method = document.getElementById('imputeMethod').value;
    
    const validValues = currentData.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    
    let fillValue;
    if (method === 'mean') {
        fillValue = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    } else if (method === 'median') {
        const sorted = [...validValues].sort((a, b) => a - b);
        fillValue = sorted[Math.floor(sorted.length / 2)];
    } else if (method === 'mode') {
        const freq = {};
        validValues.forEach(v => freq[v] = (freq[v] || 0) + 1);
        fillValue = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
    } else {
        currentData = currentData.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
        document.getElementById('imputeResults').innerHTML = `<div class="alert alert-success">Removed rows with missing ${col}. New row count: ${currentData.length}</div>`;
        generateOverview();
        return;
    }
    
    let imputedCount = 0;
    currentData.forEach(row => {
        if (row[col] === null || row[col] === undefined || row[col] === '') {
            row[col] = typeof fillValue === 'string' ? fillValue : parseFloat(fillValue);
            imputedCount++;
        }
    });
    
    document.getElementById('imputeResults').innerHTML = `<div class="alert alert-success">Imputed ${imputedCount} missing values in ${col} using ${method} method. Fill value: ${fillValue}</div>`;
    generateOverview();
}

// Export
function exportToJSON() {
    const exportData = {
        timestamp: new Date().toISOString(),
        rowCount: currentData.length,
        columnCount: columns.length,
        data: currentData
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_export.json';
    a.click();
    
    showStatus('exportStatus', 'JSON file downloaded successfully', 'success');
}

function exportToCSV() {
    let csv = columns.join(',') + '\n';
    currentData.forEach(row => {
        csv += columns.map(col => {
            const val = row[col];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_export.csv';
    a.click();
    
    showStatus('exportStatus', 'CSV file downloaded successfully', 'success');
}

function exportStatistics() {
    const stats = {};
    getNumericColumns().forEach(col => {
        const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
        if (values.length > 0) {
            const sorted = [...values].sort((a, b) => a - b);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            stats[col] = {
                mean: mean,
                median: sorted[Math.floor(sorted.length / 2)],
                min: sorted[0],
                max: sorted[sorted.length - 1],
                stdDev: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length)
            };
        }
    });
    
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statistics_export.json';
    a.click();
    
    showStatus('exportStatus', 'Statistics exported successfully', 'success');
}

// SQL Query
function executeQuery() {
    const whereClause = document.getElementById('sqlWhere').value;
    const orderBy = document.getElementById('sqlOrderBy').value;
    const orderDir = document.getElementById('sqlOrderDir').value;
    const limit = parseInt(document.getElementById('sqlLimit').value);
    
    let results = [...currentData];
    
    // WHERE clause
    if (whereClause.trim()) {
        try {
            results = results.filter(row => {
                const expr = whereClause.replace(/([A-Za-z_][A-Za-z0-9_]*)/g, (match) => {
                    return columns.includes(match) ? `row['${match}']` : match;
                });
                return eval(expr);
            });
        } catch (e) {
            document.getElementById('queryResults').innerHTML = `<div class="alert alert-error">Error in WHERE clause: ${e.message}</div>`;
            return;
        }
    }
    
    // ORDER BY
    if (orderBy) {
        results.sort((a, b) => {
            const valA = a[orderBy];
            const valB = b[orderBy];
            const compare = valA < valB ? -1 : valA > valB ? 1 : 0;
            return orderDir === 'asc' ? compare : -compare;
        });
    }
    
    // LIMIT
    results = results.slice(0, limit);
    
    let html = `<h3>Query Results (${results.length} rows)</h3><table><thead><tr>`;
    columns.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';
    results.forEach(row => {
        html += '<tr>';
        columns.forEach(col => html += `<td>${row[col] ?? 'N/A'}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    document.getElementById('queryResults').innerHTML = html;
}

// Pivot Table
function generatePivotTable() {
    const rowCol = document.getElementById('pivotRow').value;
    const colCol = document.getElementById('pivotCol').value;
    const valueCol = document.getElementById('pivotValue').value;
    const aggFunc = document.getElementById('pivotAgg').value;
    
    const pivot = {};
    const colValues = new Set();
    
    currentData.forEach(row => {
        const rowKey = row[rowCol];
        const colKey = row[colCol];
        const value = row[valueCol];
        
        if (!pivot[rowKey]) pivot[rowKey] = {};
        if (!pivot[rowKey][colKey]) pivot[rowKey][colKey] = [];
        pivot[rowKey][colKey].push(value);
        colValues.add(colKey);
    });
    
    const colArray = Array.from(colValues).sort();
    
    let html = '<h3>Pivot Table</h3><table><thead><tr><th></th>';
    colArray.forEach(col => html += `<th>${col}</th>`);
    html += '</tr></thead><tbody>';
    
    Object.keys(pivot).sort().forEach(rowKey => {
        html += `<tr><th>${rowKey}</th>`;
        colArray.forEach(colKey => {
            const values = pivot[rowKey][colKey] || [];
            let result = 'N/A';
            if (values.length > 0) {
                const validValues = values.filter(v => v !== null && !isNaN(v));
                if (validValues.length > 0) {
                    if (aggFunc === 'sum') result = validValues.reduce((a, b) => a + b, 0).toFixed(2);
                    else if (aggFunc === 'avg') result = (validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2);
                    else if (aggFunc === 'count') result = validValues.length;
                    else if (aggFunc === 'min') result = Math.min(...validValues).toFixed(2);
                    else if (aggFunc === 'max') result = Math.max(...validValues).toFixed(2);
                }
            }
            html += `<td>${result}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    
    document.getElementById('pivotResults').innerHTML = html;
}

// Forecasting
function generateForecast() {
    const indexCol = document.getElementById('forecastIndex').value;
    const valueCol = document.getElementById('forecastValue').value;
    const periods = parseInt(document.getElementById('forecastPeriods').value);
    
    const data = currentData.filter(row => 
        row[valueCol] !== null && !isNaN(row[valueCol])
    );
    
    const y = data.map(row => row[valueCol]);
    const x = Array.from({ length: y.length }, (_, i) => i);
    
    // Linear regression for trend
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const forecast = [];
    for (let i = 0; i < periods; i++) {
        forecast.push(slope * (n + i) + intercept);
    }
    
    document.getElementById('forecastResults').innerHTML = `
        <div class="result-box">
            <h4>Forecast Results</h4>
            <p><strong>Trend:</strong> ${slope > 0 ? 'Increasing' : 'Decreasing'}</p>
            <p><strong>Slope:</strong> ${slope.toFixed(4)}</p>
            <p><strong>Next ${periods} values:</strong> ${forecast.map(v => v.toFixed(2)).join(', ')}</p>
        </div>
    `;
    
    if (charts.forecast) charts.forecast.destroy();
    const ctx = document.getElementById('forecastChart').getContext('2d');
    charts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...x.map(i => `T${i}`), ...Array.from({ length: periods }, (_, i) => `F${i + 1}`)],
            datasets: [
                {
                    label: 'Historical',
                    data: y,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'transparent'
                },
                {
                    label: 'Forecast',
                    data: [...new Array(y.length).fill(null), ...forecast],
                    borderColor: '#B4413C',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { title: { display: true, text: valueCol } }
            }
        }
    });
}

// Data Wrangling
function mergeColumns() {
    const col1 = document.getElementById('mergeCol1').value;
    const col2 = document.getElementById('mergeCol2').value;
    const sep = document.getElementById('mergeSep').value;
    const newName = document.getElementById('mergeNewName').value || 'MergedColumn';
    
    currentData.forEach(row => {
        row[newName] = `${row[col1]}${sep}${row[col2]}`;
    });
    
    columns.push(newName);
    updateDropdowns();
    document.getElementById('mergeResults').innerHTML = `<div class="alert alert-success">Created column ${newName} by merging ${col1} and ${col2}</div>`;
}

function splitColumn() {
    const col = document.getElementById('splitCol').value;
    const delim = document.getElementById('splitDelim').value;
    
    const splits = currentData.map(row => String(row[col]).split(delim));
    const maxParts = Math.max(...splits.map(s => s.length));
    
    for (let i = 0; i < maxParts; i++) {
        const newName = `${col}_Part${i + 1}`;
        currentData.forEach((row, idx) => {
            row[newName] = splits[idx][i] || '';
        });
        columns.push(newName);
    }
    
    updateDropdowns();
    document.getElementById('splitResults').innerHTML = `<div class="alert alert-success">Split ${col} into ${maxParts} columns</div>`;
}

function applyFormula() {
    const expr = document.getElementById('formulaExpr').value;
    const newName = document.getElementById('formulaNewName').value || 'FormulaColumn';
    
    try {
        currentData.forEach(row => {
            const col = row;
            row[newName] = eval(expr);
        });
        
        columns.push(newName);
        updateDropdowns();
        document.getElementById('formulaResults').innerHTML = `<div class="alert alert-success">Created column ${newName} with formula</div>`;
    } catch (e) {
        document.getElementById('formulaResults').innerHTML = `<div class="alert alert-error">Formula error: ${e.message}</div>`;
    }
}

// Dashboard
function buildDashboard() {
    const html = `
        <div class="widget">
            <h3>Total Rows</h3>
            <div class="stat-value">${currentData.length}</div>
        </div>
        <div class="widget">
            <h3>Total Columns</h3>
            <div class="stat-value">${columns.length}</div>
        </div>
        <div class="widget">
            <h3>Numeric Columns</h3>
            <div class="stat-value">${getNumericColumns().length}</div>
        </div>
        <div class="widget">
            <h3>Missing Values</h3>
            <div class="stat-value">${countMissingValues()}</div>
        </div>
    `;
    document.getElementById('dashboardWidgets').innerHTML = html;
}

// AI Insights
function generateInsights() {
    const insights = [];
    
    // Anomaly detection on numeric columns
    getNumericColumns().forEach(col => {
        const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
        if (values.length > 0) {
            const sorted = [...values].sort((a, b) => a - b);
            const q1 = sorted[Math.floor(sorted.length * 0.25)];
            const q3 = sorted[Math.floor(sorted.length * 0.75)];
            const iqr = q3 - q1;
            const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
            if (outliers.length > 0) {
                insights.push(`<strong>Anomaly:</strong> ${col} has ${outliers.length} outliers (${((outliers.length / values.length) * 100).toFixed(1)}%)`);
            }
        }
    });
    
    // Strong correlations
    const numCols = getNumericColumns();
    if (numCols.length >= 2) {
        for (let i = 0; i < numCols.length; i++) {
            for (let j = i + 1; j < numCols.length; j++) {
                const corr = correlation(numCols[i], numCols[j]);
                if (Math.abs(corr) > 0.7) {
                    insights.push(`<strong>Strong Correlation:</strong> ${numCols[i]} and ${numCols[j]} (r=${corr.toFixed(3)})`);
                }
            }
        }
    }
    
    // Missing data
    columns.forEach(col => {
        const missing = currentData.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
        if (missing > currentData.length * 0.1) {
            insights.push(`<strong>Data Quality:</strong> ${col} has ${missing} missing values (${((missing / currentData.length) * 100).toFixed(1)}%)`);
        }
    });
    
    if (insights.length === 0) {
        insights.push('<strong>No significant patterns detected.</strong> Data appears clean and well-distributed.');
    }
    
    document.getElementById('insightsResults').innerHTML = `
        <div class="result-box">
            <h4>AI-Generated Insights</h4>
            <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
    `;
}

// Advanced ML
function runDecisionTree() {
    const target = document.getElementById('dtTarget').value;
    const features = Array.from(document.getElementById('dtFeatures').selectedOptions).map(o => o.value);
    
    if (features.length === 0) {
        document.getElementById('dtResults').innerHTML = '<div class="alert alert-error">Select at least one feature column</div>';
        return;
    }
    
    const data = currentData.filter(row => {
        return features.every(f => row[f] !== null && !isNaN(row[f])) && row[target] !== null;
    });
    
    // Simple decision tree simulation
    const uniqueTargets = [...new Set(data.map(row => row[target]))];
    const featureImportance = {};
    
    features.forEach(feature => {
        const correlation = Math.abs(calculateFeatureTargetCorrelation(data, feature, target));
        featureImportance[feature] = correlation;
    });
    
    document.getElementById('dtResults').innerHTML = `
        <div class="result-box">
            <h4>Decision Tree Analysis</h4>
            <p><strong>Target:</strong> ${target}</p>
            <p><strong>Features:</strong> ${features.join(', ')}</p>
            <p><strong>Samples:</strong> ${data.length}</p>
            <p><strong>Target Classes:</strong> ${uniqueTargets.length}</p>
            <h4>Feature Importance</h4>
            <ul>
                ${Object.entries(featureImportance).sort((a, b) => b[1] - a[1]).map(([f, imp]) => 
                    `<li><strong>${f}:</strong> ${imp.toFixed(3)}</li>`
                ).join('')}
            </ul>
        </div>
    `;
}

function calculateFeatureTargetCorrelation(data, feature, target) {
    const x = data.map(row => row[feature]);
    const y = data.map(row => row[target]);
    
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
        const diffY = y[i] - meanY;
        num += diffX * diffY;
        denX += diffX * diffX;
        denY += diffY * diffY;
    }
    
    return num / Math.sqrt(denX * denY);
}

function decomposeTimeSeries() {
    const col = document.getElementById('tsCol').value;
    const values = currentData.map(row => row[col]).filter(v => v !== null && !isNaN(v));
    
    if (values.length < 10) {
        document.getElementById('tsResults').innerHTML = '<div class="alert alert-error">Need at least 10 data points</div>';
        return;
    }
    
    // Calculate trend using moving average
    const windowSize = Math.min(5, Math.floor(values.length / 3));
    const trend = [];
    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
        const window = values.slice(start, end);
        trend.push(window.reduce((a, b) => a + b, 0) / window.length);
    }
    
    // Calculate seasonal component (residuals)
    const seasonal = values.map((v, i) => v - trend[i]);
    const seasonalMean = seasonal.reduce((a, b) => a + b, 0) / seasonal.length;
    
    document.getElementById('tsResults').innerHTML = `
        <div class="result-box">
            <h4>Time Series Decomposition</h4>
            <p><strong>Column:</strong> ${col}</p>
            <p><strong>Data Points:</strong> ${values.length}</p>
            <p><strong>Trend Mean:</strong> ${(trend.reduce((a, b) => a + b, 0) / trend.length).toFixed(2)}</p>
            <p><strong>Seasonal Mean:</strong> ${seasonalMean.toFixed(2)}</p>
            <p><strong>Volatility:</strong> ${Math.sqrt(seasonal.reduce((sum, v) => sum + Math.pow(v, 2), 0) / seasonal.length).toFixed(2)}</p>
        </div>
    `;
}

// Initialize
console.log('Advanced Data Analysis Platform loaded. Upload data to begin.');