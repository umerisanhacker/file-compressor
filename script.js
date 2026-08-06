const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const dropZonePrompt = document.getElementById('dropZonePrompt');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const cancelBtn = document.getElementById('cancelBtn');
const statusMessage = document.getElementById('statusMessage');

dropZone.addEventListener('click', (e) => {
    if (e.target !== cancelBtn) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        if (!file.type.startsWith('image/')) {
            showStatus('Error: Please select a valid image file (JPG/PNG).', 'error');
            resetUploader();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            if (dropZonePrompt) dropZonePrompt.classList.add('hidden');
            if (previewContainer) previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        
        showStatus('Image loaded. Ready for compression.', 'success');
    }
});

cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    resetUploader();
});

function resetUploader() {
    fileInput.value = ''; 
    imagePreview.src = ''; 
    if (previewContainer) previewContainer.classList.add('hidden'); 
    if (dropZonePrompt) dropZonePrompt.classList.remove('hidden'); 
    statusMessage.classList.add('hidden'); 
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (fileInput.files.length === 0) {
        showStatus('Error: Please select a file to compress.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('targetSize', document.getElementById('targetSize').value);

    showStatus('Establishing secure connection and compressing...', 'success');

    try {
        const response = await fetch('http://localhost:5001/api/compress/image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMessage = `Server Error (${response.status}).`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) {}
            throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'ProCompressed-' + fileInput.files[0].name.split('.')[0] + '.jpg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        showStatus('Job Complete: Image successfully compressed and downloaded.', 'success');
    } catch (err) {
        if (err.message === 'Failed to fetch') {
             showStatus('CRITICAL ERROR: Cannot connect to the backend. Is it running?', 'error');
        } else {
             showStatus(err.message, 'error');
        }
    }
});

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    statusMessage.classList.remove('hidden');
}