// Lexikon-Graph - Interaktiver Wortschatz-Graph mit Themen
class SimpleWordGraph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.currentLayout = 'sectionsCircle'; // sectionsCircle, sectionsGrouped
        this.currentTheme = 'reise';
        this.availableThemes = [];
        this.sectionColors = {};
        
        // Для перетаскивания
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.translateX = 0;
        this.translateY = 0;
        this.scale = 1;
        
        this.init();
    }
    
    async init() {
        // Загружаем список доступных тем
        await this.loadAvailableThemes();
        
        // Загружаем начальную тему
        await this.loadTheme('reise');
        
        // Рисуем граф
        this.drawGraph();
        
        // Добавляем обработчики
        this.setupEventListeners();
        
        // Применяем layout
        setTimeout(() => this.applySectionsGroupedLayout(), 100);
    }
    
    async loadAvailableThemes() {
        // Здесь нужно указать список ваших JSON файлов
        // Можно либо жестко задать список, либо динамически получать с сервера
        
        // Вариант 1: Жестко заданный список (рекомендуется)
        this.availableThemes = [
            { id: 'reise', title: 'Reisen & Urlaub' },
            { id: 'arbeit', title: 'Arbeit & Beruf' },
            { id: 'gesundheit', title: 'Gesundheit & Körper' },
            { id: 'bildung', title: 'Bildung & Lernen' }
        ];
        
        // Вариант 2: Динамическая загрузка (если есть API endpoint)
        /*
        try {
            const response = await fetch('/api/themes');
            this.availableThemes = await response.json();
        } catch (error) {
            console.warn('Konnte Themenliste nicht laden, verwende Standardliste');
            this.availableThemes = [
                { id: 'reise', title: 'Reisen & Urlaub' }
            ];
        }
        */
        
        // Заполняем select
        this.populateThemeSelect();
    }
    
    populateThemeSelect() {
        const select = document.getElementById('themeSelect');
        select.innerHTML = '';
        
        this.availableThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.title;
            if (theme.id === this.currentTheme) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
    
    async loadTheme(themeId) {
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            const response = await fetch(`data/${themeId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.currentTheme = themeId;
            
            // Обновляем выбранный пункт в селекте
            document.getElementById('themeSelect').value = themeId;
            
            // Находим название темы
            const themeTitle = this.availableThemes.find(t => t.id === themeId)?.title || themeId;
            
            // Обновляем название темы
            document.getElementById('themeName').textContent = `Thema: ${themeTitle}`;
            
            // Генерируем цвета для секций
            this.generateSectionColors();
            
            // Создаем граф из данных
            this.createGraph();
            
            // Сбрасываем трансформации
            this.resetView();
            
            // Перерисовываем
            this.drawGraph();
            
            // Применяем текущий layout
            setTimeout(() => {
                if (this.currentLayout === 'sectionsCircle') {
                    this.applySectionsCircleLayout();
                } else if (this.currentLayout === 'sectionsGrouped') {
                    this.applySectionsGroupedLayout();
                }
            }, 50);
            
            console.log(`Thema "${themeId}" geladen`);
            this.showLoading(false);
            return true;
        } catch (error) {
            console.error(`Fehler beim Laden des Themas "${themeId}":`, error);
            this.showLoading(false);
            
            // Показываем ошибку пользователю
            alert(`Thema "${themeId}" konnte nicht geladen werden. Bitte überprüfen Sie, ob die Datei existiert.`);
            
            return false;
        }
    }
    
    showLoading(show) {
        // Можно добавить индикатор загрузки
        const btn = document.getElementById('loadThemeBtn');
        if (show) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Laden...';
            btn.disabled = true;
        } else {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Thema laden';
            btn.disabled = false;
        }
    }
    
    resetView() {
        this.translateX = 0;
        this.translateY = 0;
        this.scale = 1;
    }
    
    generateSectionColors() {
        // Получаем все секции
        const sections = Object.keys(this.data.sections);
        
        // Цвета для секций (пастельные тона)
        const colors = [
            '#FFB6C1', '#98D8C8', '#B0E0E6', '#FADADD', 
            '#E6E6FA', '#FFF0B5', '#D4F1F9', '#E0BBE4',
            '#B5EAD7', '#C7CEEA', '#FFDAC1', '#FDFFB6'
        ];
        
        sections.forEach((sectionId, index) => {
            this.sectionColors[sectionId] = colors[index % colors.length];
        });
    }
    
    createGraph() {
        this.nodes = [];
        this.edges = [];
        
        if (!this.data || !this.data.sections) return;
        
        // Создаем узлы (слова) с информацией о секции
        Object.entries(this.data.sections).forEach(([sectionId, section]) => {
            Object.values(section.words).forEach(word => {
                // Определяем тип слова для цвета
                let type = 'noun';
                if (word.article === 'verb') {
                    type = 'verb';
                } else if (word.title.includes(' ') || word.phrases) {
                    type = 'phrase';
                }
                
                // Начальные позиции
                let startX = Math.random() * 700 + 50;
                let startY = Math.random() * 500 + 50;
                
                this.nodes.push({
                    id: word.id,
                    label: word.title,
                    type: type,
                    sectionId: sectionId,
                    sectionTitle: section.title,
                    sectionColor: this.sectionColors[sectionId],
                    x: startX,
                    y: startY,
                    ...word
                });
            });
        });
        
        // Создаем связи
        this.nodes.forEach((sourceNode) => {
            if (sourceNode.connections && sourceNode.connections.related) {
                sourceNode.connections.related.forEach(relatedId => {
                    const targetNode = this.nodes.find(n => n.id === relatedId);
                    if (targetNode) {
                        // Проверяем, нет ли уже такой связи
                        const existingEdge = this.edges.find(edge => 
                            (edge.source.id === sourceNode.id && edge.target.id === targetNode.id) ||
                            (edge.source.id === targetNode.id && edge.target.id === sourceNode.id)
                        );
                        
                        if (!existingEdge) {
                            this.edges.push({
                                source: sourceNode,
                                target: targetNode,
                                strength: 0.5
                            });
                        }
                    }
                });
            }
        });
    }
    
    drawGraph() {
        const svg = document.getElementById('wordGraph');
        svg.innerHTML = '';
        
        // Создаем группу для трансформаций (pan & zoom)
        const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mainGroup.setAttribute('id', 'graph-main-group');
        mainGroup.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
        svg.appendChild(mainGroup);
        
        // Добавляем легенду секций (она не должна трансформироваться)
        this.drawLegend();
        
        // Рисуем связи
        this.edges.forEach(edge => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', edge.source.x);
            line.setAttribute('y1', edge.source.y);
            line.setAttribute('x2', edge.target.x);
            line.setAttribute('y2', edge.target.y);
            
            // Разные классы для связей внутри секции и между секциями
            if (edge.source.sectionId === edge.target.sectionId) {
                line.setAttribute('class', 'edge inner-section');
            } else {
                line.setAttribute('class', 'edge cross-section');
            }
            
            mainGroup.appendChild(line);
        });
        
        // Добавляем подписи секций ДО узлов, чтобы они были на заднем плане
        if (this.currentLayout === 'sectionsGrouped' || this.currentLayout === 'sectionsCircle') {
            this.drawSectionLabels(mainGroup);
        }
        
        // Рисуем узлы
        this.nodes.forEach(node => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'node-group');
            
            // Круг узла с цветом секции
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', 22);
            circle.setAttribute('class', `node ${node.type}`);
            circle.setAttribute('data-id', node.id);
            circle.setAttribute('data-section', node.sectionId);
            
            // Применяем цвет секции
            circle.style.fill = node.sectionColor;
            circle.style.stroke = this.darkenColor(node.sectionColor, 20);
            
            // Текст
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dy', '0.3em');
            text.setAttribute('class', 'node-label');
            
            // Сокращаем длинные слова
            let displayText = node.label.replace(/^(der|die|das)\s+/i, '');
            if (displayText.length > 12) {
                displayText = displayText.substring(0, 10) + '...';
            }
            text.textContent = displayText;
            
            group.appendChild(circle);
            group.appendChild(text);
            mainGroup.appendChild(group);
            
            // Обработчики событий для узла
            circle.addEventListener('mouseenter', () => {
                circle.setAttribute('r', 26);
            });
            
            circle.addEventListener('mouseleave', () => {
                if (!circle.classList.contains('selected')) {
                    circle.setAttribute('r', 22);
                }
            });
            
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectNode(node);
            });
        });
        
        // Обновляем статистику
        this.updateStats();
    }
    
    drawLegend() {
        // Удаляем старую легенду, если есть
        const oldLegend = document.getElementById('sectionLegend');
        if (oldLegend) {
            oldLegend.innerHTML = '';
        } else {
            return;
        }
        
        const legend = document.getElementById('sectionLegend');
        legend.innerHTML = '<h4>Themenbereiche:</h4>';
        
        Object.entries(this.data.sections).forEach(([sectionId, section]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${this.sectionColors[sectionId]}"></span>
                <span class="legend-label">${section.title}</span>
            `;
            legend.appendChild(item);
        });
    }
    
    drawSectionLabels(mainGroup) {
        // Группируем узлы по секциям
        const sections = {};
        this.nodes.forEach(node => {
            if (!sections[node.sectionId]) {
                sections[node.sectionId] = [];
            }
            sections[node.sectionId].push(node);
        });
        
        // Добавляем подписи секций
        Object.entries(sections).forEach(([sectionId, nodes]) => {
            if (nodes.length === 0) return;
            
            // Находим границы секции
            const minX = Math.min(...nodes.map(n => n.x));
            const maxX = Math.max(...nodes.map(n => n.x));
            const minY = Math.min(...nodes.map(n => n.y));
            const maxY = Math.max(...nodes.map(n => n.y));
            
            let labelX, labelY;
            
            if (this.currentLayout === 'sectionsGrouped') {
                // Для grouped layout ставим подпись сверху
                labelX = (minX + maxX) / 2;
                labelY = minY - 25;
            } else {
                // Для circle layout ставим подпись сбоку
                labelX = maxX + 30;
                labelY = (minY + maxY) / 2;
            }
            
            // Фон для подписи
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', labelX - 10);
            rect.setAttribute('y', labelY - 12);
            rect.setAttribute('width', 20 + sectionId.length * 8);
            rect.setAttribute('height', 20);
            rect.setAttribute('rx', 10);
            rect.setAttribute('ry', 10);
            rect.setAttribute('fill', this.sectionColors[sectionId]);
            rect.setAttribute('opacity', '0.7');
            rect.setAttribute('class', 'section-label-bg');
            
            // Текст подписи
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', labelX);
            text.setAttribute('y', labelY);
            text.setAttribute('text-anchor', 'start');
            text.setAttribute('dy', '0.3em');
            text.setAttribute('class', 'section-label');
            text.setAttribute('fill', '#333');
            text.textContent = this.data.sections[sectionId].title;
            
            mainGroup.appendChild(rect);
            mainGroup.appendChild(text);
        });
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = (num >> 16) - percent;
        const g = ((num >> 8) & 0x00FF) - percent;
        const b = (num & 0x0000FF) - percent;
        
        const newR = Math.max(0, Math.min(255, r));
        const newG = Math.max(0, Math.min(255, g));
        const newB = Math.max(0, Math.min(255, b));
        
        return '#' + ((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1);
    }
    
    selectNode(node) {
        // Сбрасываем выделение у всех узлов
        document.querySelectorAll('.node').forEach(n => {
            n.classList.remove('selected');
            n.setAttribute('r', 22);
        });
        
        // Выделяем выбранный узел
        const selectedCircle = document.querySelector(`[data-id="${node.id}"]`);
        if (selectedCircle) {
            selectedCircle.classList.add('selected');
            selectedCircle.setAttribute('r', 28);
        }
        
        this.selectedNode = node;
        
        // Обновляем детали
        this.updateWordDetails(node);
        
        // Подсвечиваем связи
        this.highlightConnections(node.id);
    }
    
    updateWordDetails(node) {
        document.getElementById('wordTitle').textContent = node.label;
        document.getElementById('wordTranslation').textContent = node.translation;
        document.getElementById('wordLevel').textContent = `Level: ${node.level}`;
        document.getElementById('wordType').textContent = 
            node.article === 'verb' ? 'Verb' : 
            node.article ? `Nomen (${node.article})` : 'Wortgruppe';
        
        document.getElementById('wordDefinition').textContent = node.definition;
        document.getElementById('wordExample').textContent = `"${node.example}"`;
        
        // Показываем связи и дополнительные поля
        this.showConnections(node);
    }
    
    showConnections(node) {
        const container = document.getElementById('connections');
        container.innerHTML = '';
        
        // 1. Синонимы
        if (node.synonyms && node.synonyms.length > 0) {
            const div = this.createTagSection('Synonyme:', node.synonyms, 'synonym');
            container.appendChild(div);
        }
        
        // 2. Антонимы
        if (node.antonyms && node.antonyms.length > 0) {
            const div = this.createTagSection('Antonyme:', node.antonyms, 'antonym');
            container.appendChild(div);
        }
        
        // 3. Родственные слова (кликабельные!)
        if (node.connections && node.connections.related && node.connections.related.length > 0) {
            const div = document.createElement('div');
            div.className = 'related-section';
            div.innerHTML = `<strong>Verwandte Wörter:</strong><br>`;
            
            node.connections.related.forEach(wordId => {
                const relatedWord = this.nodes.find(n => n.id === wordId);
                if (relatedWord) {
                    const btn = document.createElement('button');
                    btn.className = 'related-word-btn';
                    btn.textContent = relatedWord.label;
                    btn.title = `Zu "${relatedWord.label}" wechseln`;
                    btn.addEventListener('click', () => this.selectNode(relatedWord));
                    div.appendChild(btn);
                }
            });
            
            container.appendChild(div);
        }
        
        // 4. Управление глаголами
        if (node.article === 'verb' && node.verb_management) {
            const div = document.createElement('div');
            div.className = 'verb-management';
            div.innerHTML = `
                <strong>Verwaltung:</strong><br>
                ${node.verb_management.prepositions ? 
                    `<em>Präpositionen:</em> ${node.verb_management.prepositions.join(', ')}<br>` : ''}
                ${node.verb_management.cases ? 
                    `<em>Kasus:</em> ${node.verb_management.cases.join(', ')}<br>` : ''}
                ${node.verb_management.examples ? 
                    `<em>Beispiele:</em><br>
                    ${node.verb_management.examples.map(ex => `• ${ex}`).join('<br>')}` : ''}
            `;
            container.appendChild(div);
        }
        
        // 5. Фразеологизмы
        if (node.phrases && node.phrases.length > 0) {
            const div = document.createElement('div');
            div.className = 'phrases-section';
            div.innerHTML = `<strong>Phrasen:</strong><br>`;
            node.phrases.forEach(phrase => {
                div.innerHTML += `• ${phrase}<br>`;
            });
            container.appendChild(div);
        }
        
        // 6. Контекст
        if (node.context) {
            const div = document.createElement('div');
            div.className = 'context-section';
            div.innerHTML = `<strong>Kontext:</strong><br><p>${node.context}</p>`;
            container.appendChild(div);
        }
    }
    
    createTagSection(title, items, className) {
        const div = document.createElement('div');
        div.className = `${className}-section`;
        div.innerHTML = `<strong>${title}</strong><br>`;
        
        items.forEach(item => {
            const span = document.createElement('span');
            span.className = `tag ${className}`;
            span.textContent = item;
            div.appendChild(span);
            div.appendChild(document.createTextNode(' '));
        });
        
        return div;
    }
    
    highlightConnections(nodeId) {
        // Сбрасываем подсветку
        document.querySelectorAll('.edge').forEach(edge => {
            edge.classList.remove('highlighted');
        });
        
        // Подсвечиваем связи выбранного узла
        this.edges.forEach(edge => {
            if (edge.source.id === nodeId || edge.target.id === nodeId) {
                // Находим линию в главной группе
                const mainGroup = document.getElementById('graph-main-group');
                if (mainGroup) {
                    const lines = mainGroup.querySelectorAll('line');
                    lines.forEach(line => {
                        const x1 = parseFloat(line.getAttribute('x1'));
                        const y1 = parseFloat(line.getAttribute('y1'));
                        const x2 = parseFloat(line.getAttribute('x2'));
                        const y2 = parseFloat(line.getAttribute('y2'));
                        
                        if (Math.abs(x1 - edge.source.x) < 1 && Math.abs(y1 - edge.source.y) < 1 &&
                            Math.abs(x2 - edge.target.x) < 1 && Math.abs(y2 - edge.target.y) < 1) {
                            line.classList.add('highlighted');
                            
                            setTimeout(() => {
                                line.classList.remove('highlighted');
                            }, 3000);
                        }
                    });
                }
            }
        });
    }
    
    
    
    applySectionsCircleLayout() {
        this.currentLayout = 'sectionsCircle';
        this.updateLayoutButton();
        
        const centerX = 400;
        const centerY = 300;
        const mainRadius = 200;
        
        // Группируем узлы по секциям
        const sections = {};
        this.nodes.forEach(node => {
            if (!sections[node.sectionId]) {
                sections[node.sectionId] = [];
            }
            sections[node.sectionId].push(node);
        });
        
        const sectionIds = Object.keys(sections);
        const sectionCount = sectionIds.length;
        
        // Располагаем секции по кругу
        sectionIds.forEach((sectionId, sectionIndex) => {
            const sectionNodes = sections[sectionId];
            const sectionAngle = (sectionIndex * 2 * Math.PI) / sectionCount;
            
            // Центр секции
            const sectionCenterX = centerX + mainRadius * Math.cos(sectionAngle);
            const sectionCenterY = centerY + mainRadius * Math.sin(sectionAngle);
            
            // Радиус для узлов внутри секции
            const nodeRadius = Math.max(60, Math.min(100, 40 + sectionNodes.length * 3));
            
            // Располагаем узлы секции по кругу вокруг центра секции
            sectionNodes.forEach((node, nodeIndex) => {
                const nodeAngle = (nodeIndex * 2 * Math.PI) / sectionNodes.length;
                node.x = sectionCenterX + nodeRadius * Math.cos(nodeAngle);
                node.y = sectionCenterY + nodeRadius * Math.sin(nodeAngle);
            });
        });
        
        this.drawGraph();
    }
    
    applySectionsGroupedLayout() {
        this.currentLayout = 'sectionsGrouped';
        this.updateLayoutButton();
        
        const startX = 150;
        const startY = 100;
        const sectionWidth = 180;
        const sectionHeight = 400;
        
        // Группируем узлы по секциям
        const sections = {};
        this.nodes.forEach(node => {
            if (!sections[node.sectionId]) {
                sections[node.sectionId] = [];
            }
            sections[node.sectionId].push(node);
        });
        
        const sectionIds = Object.keys(sections);
        
        // Располагаем секции горизонтально
        sectionIds.forEach((sectionId, sectionIndex) => {
            const sectionNodes = sections[sectionId];
            const sectionX = startX + sectionIndex * sectionWidth;
            
            // Распределяем узлы вертикально внутри секции
            const nodeSpacing = sectionHeight / (sectionNodes.length + 1);
            
            sectionNodes.forEach((node, nodeIndex) => {
                node.x = sectionX + (Math.random() * 30 - 15); // Небольшой случайный сдвиг по X
                node.y = startY + (nodeIndex + 1) * nodeSpacing;
            });
        });
        
        this.drawGraph();
    }
    
    updateLayoutButton() {
        const btn = document.getElementById('layoutBtn');
        if (this.currentLayout === 'sectionsGrouped') {
            btn.innerHTML = '<i class="fas fa-circle"></i> Kreis-Layout';
        } else if (this.currentLayout === 'sectionsCircle') {
            btn.innerHTML = '<i class="fas fa-layer-group"></i> Gruppen-Layout';
        }
    }
    
    updateStats() {
        document.getElementById('nodeCount').textContent = `${this.nodes.length} Wörter`;
        document.getElementById('edgeCount').textContent = `${this.edges.length} Verbindungen`;
    }
    
    setupEventListeners() {
        // Кнопка сброса графа
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetView();
            this.createGraph();
            this.drawGraph();
        });
        
        // Кнопка смены layout
        document.getElementById('layoutBtn').addEventListener('click', () => {
            if (this.currentLayout === 'sectionsGrouped') {
                this.applySectionsCircleLayout();
            } else if (this.currentLayout === 'sectionsCircle') {
                this.applySectionsGroupedLayout();
            }
        });
        
        // Загрузка темы
        document.getElementById('loadThemeBtn').addEventListener('click', () => {
            const themeId = document.getElementById('themeSelect').value;
            this.loadTheme(themeId);
        });
        
        // Поиск
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length >= 2) {
                const found = this.nodes.find(node => 
                    node.label.toLowerCase().includes(query) || 
                    node.translation.toLowerCase().includes(query)
                );
                
                if (found) {
                    this.selectNode(found);
                    
                    // Центрируем вид на найденном узле
                    this.translateX = 400 - found.x * this.scale;
                    this.translateY = 300 - found.y * this.scale;
                    this.drawGraph();
                }
            }
        });
        
        // Перетаскивание карты
        const svg = document.getElementById('wordGraph');
        
        svg.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'svg' || e.target.tagName === 'g' || e.target.classList.contains('section-label-bg')) {
                this.isDragging = true;
                this.startX = e.clientX - this.translateX;
                this.startY = e.clientY - this.translateY;
                svg.style.cursor = 'grabbing';
            }
        });
        
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.translateX = e.clientX - this.startX;
                this.translateY = e.clientY - this.startY;
                
                const mainGroup = document.getElementById('graph-main-group');
                if (mainGroup) {
                    mainGroup.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
                }
            }
        });
        
        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                svg.style.cursor = 'default';
            }
        });
        
        // Zoom колесиком
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const zoomFactor = 0.1;
            const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
            const newScale = Math.max(0.5, Math.min(2, this.scale + delta));
            
            // Zoom относительно позиции мыши
            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const scaleChange = newScale / this.scale;
            
            this.translateX = mouseX - (mouseX - this.translateX) * scaleChange;
            this.translateY = mouseY - (mouseY - this.translateY) * scaleChange;
            this.scale = newScale;
            
            const mainGroup = document.getElementById('graph-main-group');
            if (mainGroup) {
                mainGroup.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
            }
        });
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.wordGraph = new SimpleWordGraph();
});