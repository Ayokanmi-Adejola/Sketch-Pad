document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const sizeDisplay = document.getElementById('size-display');

    // Set canvas size
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.offsetWidth;

        // Calculate available height based on viewport and other elements
        const headerHeight = document.querySelector('header').offsetHeight || 0;
        const toolbarHeight = document.querySelector('.toolbar').offsetHeight || 0;
        const footerHeight = document.querySelector('footer').offsetHeight || 0;

        // Calculate available height with some padding
        const padding = 40;
        const availableHeight = window.innerHeight - headerHeight - toolbarHeight - footerHeight - padding;
        
        // Set canvas dimensions based on device
        if (window.innerWidth <= 480) {
            // Mobile devices
            canvas.width = containerWidth - 20;
            canvas.height = Math.min(500, availableHeight);
        } else if (window.innerWidth <= 768) {
            // Tablets
            canvas.width = containerWidth - 30;
            canvas.height = Math.min(600, availableHeight);
        } else {
            // Desktops
            canvas.width = Math.min(1200, containerWidth - 40);
            canvas.height = Math.min(800, availableHeight);
        }

        // Ensure minimum dimensions
        canvas.width = Math.max(canvas.width, 280);
        canvas.height = Math.max(canvas.height, 300);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Drawing state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let brushSize = 5;
    let currentColor = '#000000';
    let isEraser = false;
    let drawingHistory = [];
    let historyIndex = -1;

    // Save initial canvas state
    saveToHistory();

    // Tool elements
    const brushSizeInput = document.getElementById('brush-size');
    const colorPicker = document.getElementById('color-picker');
    const penBtn = document.getElementById('pen');
    const eraserBtn = document.getElementById('eraser');
    const clearBtn = document.getElementById('clear');
    const saveBtn = document.getElementById('save');
    const colorButtons = document.querySelectorAll('.color-btn');

    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);

    // Tool event listeners
    brushSizeInput.addEventListener('input', updateBrushSize);
    colorPicker.addEventListener('input', updateColor);
    penBtn.addEventListener('click', activatePen);
    eraserBtn.addEventListener('click', toggleEraser);
    clearBtn.addEventListener('click', clearCanvas);
    saveBtn.addEventListener('click', saveDrawing);

    // Color palette event listeners
    colorButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            currentColor = color;
            colorPicker.value = color;
            updateColorButtonsState(this);
            activatePen();
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Drawing functions
    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);

        // Start a new path for smoother lines
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);

        // Draw a single dot if the user just clicks
        ctx.arc(lastX, lastY, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEraser ? '#FFFFFF' : currentColor;
        ctx.fill();
    }

    function draw(e) {
        if (!isDrawing) return;

        const [x, y] = getCoordinates(e);

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSize;

        if (isEraser) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.strokeStyle = currentColor;
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        [lastX, lastY] = [x, y];
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            saveToHistory();
        }
    }

    // Touch handling
    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }

    // Helper function to get coordinates
    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }

    // Tool functions
    function updateBrushSize() {
        brushSize = brushSizeInput.value;
        sizeDisplay.textContent = brushSize;
    }

    function updateColor() {
        currentColor = colorPicker.value;
        updateColorButtonsState();
        activatePen();
    }

    function activatePen() {
        isEraser = false;
        penBtn.classList.add('active');
        eraserBtn.classList.remove('active');
        canvas.style.cursor = 'crosshair';
    }

    function toggleEraser() {
        isEraser = true;
        eraserBtn.classList.add('active');
        penBtn.classList.remove('active');
        canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23000000\' d=\'M15.14,3C14.63,3 14.12,3.2 13.73,3.59L2.59,14.73C1.81,15.5 1.81,16.77 2.59,17.56L5.03,20H12.69L21.41,11.27C22.2,10.5 22.2,9.23 21.41,8.44L16.56,3.59C16.17,3.2 15.65,3 15.14,3M17,18L15,20H22V18\'/%3E%3C/svg%3E") 0 24, auto';
    }

    function updateColorButtonsState(activeButton = null) {
        // Remove active class from all buttons
        colorButtons.forEach(btn => btn.classList.remove('active'));

        // If an active button is provided, add active class to it
        if (activeButton) {
            activeButton.classList.add('active');
            return;
        }

        // Otherwise, find the button that matches the current color
        colorButtons.forEach(btn => {
            if (btn.getAttribute('data-color').toLowerCase() === currentColor.toLowerCase()) {
                btn.classList.add('active');
            }
        });
    }

    function clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveToHistory();
        }
    }

    function saveDrawing() {
        // Create a temporary canvas to add a watermark
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the main canvas content
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        // Add a subtle watermark
        tempCtx.font = '14px Poppins';
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        tempCtx.textAlign = 'end';
        tempCtx.fillText('Created with Ayokanmi\'s Sketch Pad', tempCanvas.width - 20, tempCanvas.height - 20);

        // Get current date for filename
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

        // Create download link
        const link = document.createElement('a');
        link.download = `sketch_${formattedDate}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();

        // Show a success message
        showMessage('Drawing saved successfully!');
    }

    // History functions
    function saveToHistory() {
        // If we're not at the end of the history, remove everything after current index
        if (historyIndex < drawingHistory.length - 1) {
            drawingHistory = drawingHistory.slice(0, historyIndex + 1);
        }

        // Save current state
        const imageData = canvas.toDataURL();
        drawingHistory.push(imageData);
        historyIndex = drawingHistory.length - 1;

        // Limit history size to prevent memory issues
        if (drawingHistory.length > 20) {
            drawingHistory.shift();
            historyIndex--;
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            loadFromHistory();
        } else {
            showMessage('Nothing to undo!');
        }
    }

    function redo() {
        if (historyIndex < drawingHistory.length - 1) {
            historyIndex++;
            loadFromHistory();
        } else {
            showMessage('Nothing to redo!');
        }
    }

    function loadFromHistory() {
        const img = new Image();
        img.src = drawingHistory[historyIndex];
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }

    // Keyboard shortcuts
    function handleKeyboardShortcuts(e) {
        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        }

        // Ctrl+Y for redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }

        // E for eraser
        if (e.key === 'e') {
            toggleEraser();
        }

        // P for pen
        if (e.key === 'p') {
            activatePen();
        }

        // S for save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveDrawing();
        }
    }

    // UI feedback
    function showMessage(message) {
        // Create message element if it doesn't exist
        let messageEl = document.getElementById('message-popup');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'message-popup';
            messageEl.style.position = 'fixed';
            messageEl.style.bottom = '20px';
            messageEl.style.left = '50%';
            messageEl.style.transform = 'translateX(-50%)';
            messageEl.style.backgroundColor = 'var(--primary-color)';
            messageEl.style.color = 'white';
            messageEl.style.padding = '10px 20px';
            messageEl.style.borderRadius = 'var(--border-radius)';
            messageEl.style.boxShadow = 'var(--shadow)';
            messageEl.style.zIndex = '1000';
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s ease';
            messageEl.style.textAlign = 'center';
            messageEl.style.maxWidth = '90%';
            document.body.appendChild(messageEl);
        }

        // Set message and show
        messageEl.textContent = message;
        messageEl.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
        }, 3000);
    }

    // Initialize
    function init() {
        // Set initial active tool
        activatePen();

        // Set initial active color
        updateColorButtonsState();

        // Welcome message
        setTimeout(() => {
            showMessage('Welcome to Ayokanmi\'s Sketch Pad! Start drawing...');
        }, 500);
    }

    init();
});
