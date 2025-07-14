export class UI {
    constructor() {
        this.cutListVisible = false;
    }
    
    displayCutList(cutListData, config = {}) {
        const panel = document.getElementById('cutlist-panel');
        const content = document.getElementById('cutlist-content');
        
        content.innerHTML = this.generateCutListHTML(cutListData, config);
        panel.style.display = 'block';
        this.cutListVisible = true;
        
        panel.scrollIntoView({ behavior: 'smooth' });
    }
    
    generateCutListHTML(data, config = {}) {
        const { cuts, materialUsage, cost, summary } = data;
        const units = config.units || 'imperial';
        const unitSymbol = units === 'metric' ? 'cm' : '"';
        
        let html = `
            <div class="cutlist-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>Total Parts:</strong> ${summary.totalParts}
                    </div>
                    <div class="summary-item">
                        <strong>Material:</strong> ${summary.totalBoardFeet} board feet
                    </div>
                    <div class="summary-item">
                        <strong>Estimated Time:</strong> ${summary.estimatedTime}
                    </div>
                    <div class="summary-item">
                        <strong>Difficulty:</strong> ${summary.difficulty}
                    </div>
                    <div class="summary-item">
                        <strong>Estimated Cost:</strong> $${cost.total.toFixed(2)}
                    </div>
                </div>
            </div>
            
            <table class="cutlist-table">
                <thead>
                    <tr>
                        <th>Part</th>
                        <th>Qty</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Thickness</th>
                        <th>Board Feet</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        cuts.forEach(cut => {
            html += `
                <tr>
                    <td><strong>${cut.part}</strong></td>
                    <td>${cut.quantity}</td>
                    <td>${this.formatDimension(cut.width)}${unitSymbol}</td>
                    <td>${this.formatDimension(cut.height)}${unitSymbol}</td>
                    <td>${this.formatDimension(cut.thickness)}${unitSymbol}</td>
                    <td>${cut.boardFeet}</td>
                    <td><small>${cut.notes}</small></td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            
            <div class="material-breakdown">
                <h4>Material Breakdown</h4>
        `;
        
        Object.entries(materialUsage).forEach(([material, usage]) => {
            html += `
                <div class="material-item">
                    <strong>${this.capitalize(material)}:</strong>
                    ${usage.sheetsNeeded} sheet(s) - 
                    ${usage.totalBoardFeet.toFixed(2)} board feet - 
                    $${usage.cost.toFixed(2)}
                </div>
            `;
        });
        
        html += `
            </div>
            
            <div class="cost-breakdown">
                <h4>Cost Breakdown</h4>
                <div class="cost-item">Materials: $${cost.materials.toFixed(2)}</div>
                <div class="cost-item">Hardware: $${cost.hardware.toFixed(2)}</div>
                <div class="cost-item total-cost"><strong>Total: $${cost.total.toFixed(2)}</strong></div>
            </div>
            
            <div class="cutting-tips">
                <h4>Cutting Tips</h4>
                <ul>
                    <li>Always measure twice, cut once</li>
                    <li>Account for saw blade kerf (~1/8") in your measurements</li>
                    <li>Cut all pieces of the same dimension at once for consistency</li>
                    <li>Sand all pieces before assembly for best finish</li>
                    <li>Test fit joints before final assembly</li>
                </ul>
            </div>
        `;
        
        return html;
    }
    
    formatDimension(inches) {
        const wholeInches = Math.floor(inches);
        const fraction = inches - wholeInches;
        
        if (fraction === 0) {
            return wholeInches.toString();
        }
        
        const commonFractions = {
            0.125: '1/8',
            0.25: '1/4',
            0.375: '3/8',
            0.5: '1/2',
            0.625: '5/8',
            0.75: '3/4',
            0.875: '7/8'
        };
        
        const roundedFraction = Math.round(fraction * 8) / 8;
        const fractionText = commonFractions[roundedFraction];
        
        if (fractionText) {
            return wholeInches > 0 ? `${wholeInches} ${fractionText}` : fractionText;
        }
        
        return inches.toFixed(3);
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    exportToPDF(cutListData, config) {
        const printContent = this.generatePrintableHTML(cutListData, config);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Shelf Cut List</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 20px;
                    }
                    .project-specs {
                        background: #f5f5f5;
                        padding: 15px;
                        margin-bottom: 20px;
                        border-radius: 5px;
                    }
                    .specs-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #333;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background: #f0f0f0;
                        font-weight: bold;
                    }
                    .summary-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 20px;
                    }
                    .section {
                        border: 1px solid #ddd;
                        padding: 15px;
                        border-radius: 5px;
                    }
                    .section h3 {
                        margin-top: 0;
                        color: #8B4513;
                    }
                    ul {
                        margin: 0;
                        padding-left: 20px;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }
    
    generatePrintableHTML(cutListData, config) {
        const { cuts, materialUsage, cost, summary } = cutListData;
        const currentDate = new Date().toLocaleDateString();
        
        return `
            <div class="header">
                <h1>Custom Shelf Cut List</h1>
                <p>Generated on ${currentDate}</p>
            </div>
            
            <div class="project-specs">
                <h3>Project Specifications</h3>
                <div class="specs-grid">
                    <div><strong>Dimensions:</strong> ${config.width}" W × ${config.height}" H × ${config.depth}" D</div>
                    <div><strong>Material:</strong> ${this.capitalize(config.materialType)} (${this.formatDimension(config.materialThickness)}" thick)</div>
                    <div><strong>Shelves:</strong> ${config.shelfCount} total</div>
                    <div><strong>Joint Type:</strong> ${this.capitalize(config.jointType)} joints</div>
                    <div><strong>Back Panel:</strong> ${config.backPanel ? 'Yes' : 'No'}</div>
                    <div><strong>Adjustable:</strong> ${config.adjustableShelves ? 'Yes' : 'No'}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Part Name</th>
                        <th>Quantity</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Thickness</th>
                        <th>Board Feet</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${cuts.map(cut => `
                        <tr>
                            <td><strong>${cut.part}</strong></td>
                            <td>${cut.quantity}</td>
                            <td>${this.formatDimension(cut.width)}"</td>
                            <td>${this.formatDimension(cut.height)}"</td>
                            <td>${this.formatDimension(cut.thickness)}"</td>
                            <td>${cut.boardFeet}</td>
                            <td>${cut.notes}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="summary-section">
                <div class="section">
                    <h3>Material Requirements</h3>
                    ${Object.entries(materialUsage).map(([material, usage]) => `
                        <p><strong>${this.capitalize(material)}:</strong><br>
                        ${usage.sheetsNeeded} sheet(s) - ${usage.totalBoardFeet.toFixed(2)} board feet</p>
                    `).join('')}
                </div>
                
                <div class="section">
                    <h3>Project Summary</h3>
                    <p><strong>Total Parts:</strong> ${summary.totalParts}</p>
                    <p><strong>Estimated Time:</strong> ${summary.estimatedTime}</p>
                    <p><strong>Difficulty Level:</strong> ${summary.difficulty}</p>
                    <p><strong>Estimated Cost:</strong> $${cost.total.toFixed(2)}</p>
                </div>
            </div>
            
            <div class="section">
                <h3>Assembly Notes</h3>
                <ul>
                    <li>Dry fit all pieces before applying glue</li>
                    <li>Use clamps during glue-up for tight joints</li>
                    <li>Sand all surfaces starting with 120 grit, finishing with 220 grit</li>
                    <li>Apply finish according to manufacturer's instructions</li>
                    <li>For dado joints, test fit with scrap pieces first</li>
                    ${config.adjustableShelves ? '<li>Drill shelf pin holes using a drilling jig for accuracy</li>' : ''}
                    ${config.backPanel ? '<li>Install back panel after assembling the main structure</li>' : ''}
                </ul>
            </div>
        `;
    }
    
    resetInputs(config) {
        Object.entries(config).forEach(([key, value]) => {
            const elementId = this.getElementId(key);
            const element = document.getElementById(elementId);
            
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
        
        document.getElementById('cutlist-panel').style.display = 'none';
        this.cutListVisible = false;
    }
    
    getElementId(configKey) {
        const idMap = {
            'width': 'width',
            'height': 'height', 
            'depth': 'depth',
            'materialThickness': 'material-thickness',
            'materialType': 'material-type',
            'shelfCount': 'shelf-count',
            'shelfSpacing': 'shelf-spacing',
            'backPanel': 'back-panel',
            'adjustableShelves': 'adjustable-shelves',
            'jointType': 'joint-type',
            'edgeTreatment': 'edge-treatment',
            'woodGrain': 'wood-grain'
        };
        return idMap[configKey];
    }
}