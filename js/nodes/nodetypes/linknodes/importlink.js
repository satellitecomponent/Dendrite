async function importLinkNodeTextToZettelkasten(link) {
    const text = await fetchLinkContentText(link);
    if (!text) {
        console.error('Failed to retrieve text for importing into Zettelkasten:', link);
        return;
    }

    Modal.open('importLinkModalContent');
    Elem.byId('importLinkTextarea').value = text;
}

async function confirmImport() {
    const maxSentencesPerNote = parseInt(Elem.byId('maxSentencesPerNote').value);
    zetSplit.maxSentencesPerNote = maxSentencesPerNote;
    zetSplit.maxCharsPerNote = maxSentencesPerNote * 100;
    zetSplit.connectNotes = Elem.byId('connectNotes').checked;

    // Split the text for Zettelkasten
    const formattedTexts = zetSplit.splitText(Elem.byId('importLinkTextarea').value);

    function addTextToCodemirror(textChunk) {
        if (window.currentActiveZettelkastenMirror) {
            const totalLines = window.currentActiveZettelkastenMirror.lineCount();
            window.currentActiveZettelkastenMirror.replaceRange(textChunk, { line: totalLines, ch: 0 });
        } else {
            console.error('Codemirror instance not found.');
        }
    }

    Modal.close();

    // Append the notes one at a time with a delay between each note
    for (const note of formattedTexts) {
        addTextToCodemirror(note + "\n\n");
        await Promise.delay(30);
    }
}
