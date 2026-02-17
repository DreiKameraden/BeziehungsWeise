// Lexikon-Graph - Interaktiver Wortschatz-Graph mit Themen
class SimpleWordGraph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.currentLayout = 'force';
        this.currentTheme = 'reise';
        
        this.init();
    }
    
    async init() {
        // Загружаем начальную тему
        await this.loadTheme('reise');
        
        // Рисуем граф
        this.drawGraph();
        
        // Добавляем обработчики
        this.setupEventListeners();
        
        // Применяем force layout
        setTimeout(() => this.applyForceLayout(), 100);
    }
    
    async loadTheme(themeName) {
        try {
            const response = await fetch(`data/${themeName}.json`);
            this.data = await response.json();
            this.currentTheme = themeName;
            
            // Обновляем название темы
            document.getElementById('themeName').textContent = 
                `Thema: ${this.data.metadata?.title || themeName}`;
            
            // Создаем граф из данных
            this.createGraph();
            
            // Перерисовываем
            this.drawGraph();
            
            // Применяем layout
            setTimeout(() => {
                if (this.currentLayout === 'force') {
                    this.applyForceLayout();
                } else {
                    this.applyCircleLayout();
                }
            }, 50);
            
            console.log(`Thema "${themeName}" geladen`);
            return true;
        } catch (error) {
            console.error(`Fehler beim Laden des Themas "${themeName}":`, error);
            
            // Fallback auf reise.json
            if (themeName !== 'reise') {
                alert(`Thema "${themeName}" nicht gefunden. Lade Standard-Thema.`);
                await this.loadTheme('reise');
            }
            return false;
        }
    }
    
    createGraph() {
        this.nodes = [];
        this.edges = [];
        
        if (!this.data || !this.data.sections) return;
        
        // Создаем узлы (слова)
        Object.values(this.data.sections).forEach(section => {
            Object.values(section.words).forEach(word => {
                // Определяем тип слова для цвета
                let type = 'noun';
                if (word.article === 'verb') {
                    type = 'verb';
                } else if (word.title.includes(' ') || word.phrases) {
                    type = 'phrase';
                }
                
                // Начальные позиции в разных квадрантах в зависимости от типа
                let startX, startY;
                switch(type) {
                    case 'verb':
                        startX = Math.random() * 300 + 50;
                        startY = Math.random() * 300 + 50;
                        break;
                    case 'phrase':
                        startX = Math.random() * 300 + 450;
                        startY = Math.random() * 300 + 50;
                        break;
                    default: // noun
                        startX = Math.random() * 300 + 50;
                        startY = Math.random() * 300 + 300;
                }
                
                this.nodes.push({
                    id: word.id,
                    label: word.title,
                    type: type,
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
        
        // Рисуем связи
        this.edges.forEach(edge => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', edge.source.x);
            line.setAttribute('y1', edge.source.y);
            line.setAttribute('x2', edge.target.x);
            line.setAttribute('y2', edge.target.y);
            line.setAttribute('class', 'edge');
            svg.appendChild(line);
        });
        
        // Рисуем узлы
        this.nodes.forEach(node => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'node-group');
            
            // Круг узла
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', 22);
            circle.setAttribute('class', `node ${node.type}`);
            circle.setAttribute('data-id', node.id);
            
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
            svg.appendChild(group);
            
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
                const line = document.querySelector(`line[x1="${edge.source.x}"][y1="${edge.source.y}"]`);
                if (line) {
                    line.classList.add('highlighted');
                    
                    // Удаляем подсветку через 3 секунды
                    setTimeout(() => {
                        line.classList.remove('highlighted');
                    }, 3000);
                }
            }
        });
    }
    
    applyForceLayout() {
        this.currentLayout = 'force';
        
        // Простая force-симуляция
        const centerX = 400;
        const centerY = 300;
        const repulsion = 100;
        const attraction = 0.1;
        
        // 30 итераций для плавности
        for (let iter = 0; iter < 30; iter++) {
            this.nodes.forEach((node, i) => {
                // Отталкивание от других узлов
                this.nodes.forEach((other, j) => {
                    if (i !== j) {
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0 && distance < 150) {
                            const force = repulsion / (distance * distance);
                            node.x += (dx / distance) * force * 0.5;
                            node.y += (dy / distance) * force * 0.5;
                        }
                    }
                });
                
                // Притяжение к центру
                const dx = centerX - node.x;
                const dy = centerY - node.y;
                node.x += dx * 0.02;
                node.y += dy * 0.02;
            });
            
            // Притяжение по связям
            this.edges.forEach(edge => {
                const dx = edge.target.x - edge.source.x;
                const dy = edge.target.y - edge.source.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const force = (distance - 100) * attraction;
                    edge.source.x += (dx / distance) * force * 0.5;
                    edge.source.y += (dy / distance) * force * 0.5;
                    edge.target.x -= (dx / distance) * force * 0.5;
                    edge.target.y -= (dy / distance) * force * 0.5;
                }
            });
        }
        
        this.drawGraph();
    }
    
    applyCircleLayout() {
        this.currentLayout = 'circle';
        
        const centerX = 400;
        const centerY = 300;
        const radius = Math.min(250, 150 + this.nodes.length * 5);
        const angleStep = (2 * Math.PI) / this.nodes.length;
        
        this.nodes.forEach((node, i) => {
            const angle = i * angleStep;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
        });
        
        this.drawGraph();
    }
    
    updateStats() {
        document.getElementById('nodeCount').textContent = `${this.nodes.length} Wörter`;
        document.getElementById('edgeCount').textContent = `${this.edges.length} Verbindungen`;
    }
    
    setupEventListeners() {
        // Кнопка сброса графа
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.createGraph();
            this.drawGraph();
            this.applyForceLayout();
        });
        
        // Кнопка смены layout
        document.getElementById('layoutBtn').addEventListener('click', () => {
            if (this.currentLayout === 'force') {
                this.applyCircleLayout();
                document.getElementById('layoutBtn').innerHTML = 
                    '<i class="fas fa-circle"></i> Force-Layout';
            } else {
                this.applyForceLayout();
                document.getElementById('layoutBtn').innerHTML = 
                    '<i class="fas fa-network-wired"></i> Kreis-Layout';
            }
        });
        
        // Загрузка темы
        document.getElementById('loadThemeBtn').addEventListener('click', () => {
            const theme = document.getElementById('themeSelect').value;
            this.loadTheme(theme);
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
                    
                    // Плавный скролл к узлу
                    const svg = document.querySelector('.graph-container');
                    svg.scrollTo({
                        left: found.x - 400,
                        top: found.y - 300,
                        behavior: 'smooth'
                    });
                }
            }
        });
        
        // Предзагрузка всех тем при выборе в селекте
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            // Можно добавить предзагрузку или превью
            console.log(`Thema ausgewählt: ${e.target.value}`);
        });
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.wordGraph = new SimpleWordGraph();
});