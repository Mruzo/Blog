import 'emoji-picker-element';

document.addEventListener('DOMContentLoaded', function() {
    // Create emoji picker container
    const pickerContainer = document.createElement('div');
    pickerContainer.style.position = 'absolute';
    pickerContainer.style.zIndex = '1000';
    pickerContainer.style.display = 'none';
    document.body.appendChild(pickerContainer);

    // Create emoji picker
    const picker = document.createElement('emoji-picker');
    pickerContainer.appendChild(picker);

    // Add emoji button to all text fields
    const textFields = document.querySelectorAll('textarea, input[type="text"]');
    textFields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        field.parentNode.insertBefore(wrapper, field);
        wrapper.appendChild(field);

        // Create emoji button
        const emojiButton = document.createElement('button');
        emojiButton.innerHTML = '😊';
        emojiButton.style.position = 'absolute';
        emojiButton.style.right = '5px';
        emojiButton.style.top = '5px';
        emojiButton.style.background = 'none';
        emojiButton.style.border = 'none';
        emojiButton.style.cursor = 'pointer';
        emojiButton.style.fontSize = '1.2em';
        wrapper.appendChild(emojiButton);

        // Handle emoji button click
        emojiButton.addEventListener('click', (e) => {
            e.preventDefault();
            const rect = emojiButton.getBoundingClientRect();
            pickerContainer.style.display = 'block';
            pickerContainer.style.top = `${rect.bottom + window.scrollY}px`;
            pickerContainer.style.left = `${rect.left + window.scrollX}px`;
        });

        // Handle emoji selection
        picker.addEventListener('emoji-click', event => {
            const cursorPos = field.selectionStart;
            const text = field.value;
            const newText = text.slice(0, cursorPos) + event.detail.unicode + text.slice(cursorPos);
            field.value = newText;
            field.focus();
            field.setSelectionRange(cursorPos + 2, cursorPos + 2);
            pickerContainer.style.display = 'none';
        });
    });

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!pickerContainer.contains(e.target) && !e.target.matches('button')) {
            pickerContainer.style.display = 'none';
        }
    });
}); 