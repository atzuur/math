const u = require('./util')

let MQ
module.exports = {init}
let firstTime = true

function init($outerPlaceholder, focus, onMathFocusChanged) {
    let updateMathImgTimeout

    if(firstTime) {
        MQ = MathQuill.getInterface(2)
    }
    const $mathEditorContainer = $(`
        <div class="math-editor" data-js="mathEditor">
            <div class="math-editor-equation-field" data-js="equationField"></div>
            <textarea rows="1" class="math-editor-latex-field" data-js="latexField" placeholder="LaTex"></textarea>
        </div>`)

    $outerPlaceholder.append($mathEditorContainer)
    const $latexField = $mathEditorContainer.find('[data-js="latexField"]')
    const $equationField = $mathEditorContainer.find('[data-js="equationField"]')
    let mqEditTimeout
    let visible = false
    let focusChanged = null
    //noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
    const mqInstance = MQ.MathField($equationField.get(0), {
        handlers: {
            edit: onMqEdit,
            enter: field => {
                closeMathEditor(true)
                setTimeout(() => insertNewEquation('<br>'), 2)
            }
        }
    })
    $equationField
        .on('input', '.mq-textarea textarea', onMqEdit)
        .on('focus blur', '.mq-textarea textarea', e => {
            focus.equationField = e.type !== 'blur' && e.type !== 'focusout'
            onFocusChanged()
        })

    $latexField
        .on('input paste', onLatexUpdate)
        .on('focus blur', e => {
            focus.latexField = e.type !== 'blur'
            onFocusChanged()
        })

    return {
        insertNewEquation,
        insertMath,
        closeMathEditor,
        openMathEditor,
        onFocusChanged,
        isVisible
    }

    function isVisible() {
        return visible
    }

    function onMqEdit(e) {
        e && e.originalEvent && e.originalEvent.stopPropagation()
        clearTimeout(mqEditTimeout)
        mqEditTimeout = setTimeout(() => {
            if (focus.latexField)
                return
            const latex = mqInstance.latex()
            $latexField.val(latex)
            updateMathImgWithDebounce($mathEditorContainer.prev(), latex)
        }, 0)
    }

    function onLatexUpdate(e) {
        e && e.originalEvent && e.originalEvent.stopPropagation()
        updateMathImgWithDebounce($mathEditorContainer.prev(), $latexField.val())
        setTimeout(() => mqInstance.latex($latexField.val()), 1)
    }

    function onFocusChanged() {
        clearTimeout(focusChanged)
        focusChanged = setTimeout(() => {
            if (!focus.latexField && !focus.equationField) closeMathEditor()
            onMathFocusChanged()
        }, 0)
    }

    function insertNewEquation(optionalMarkup = '') {
        window.document.execCommand('insertHTML', false, optionalMarkup + '<img data-js="new" alt="" src="" style="display: none"/>')
        showMathEditor($('[data-js="new"]').removeAttr('data-js'))
    }

    function openMathEditor($img) {
        if (visible) closeMathEditor()
        u.setCursorAfter($img)
        showMathEditor($img)
    }

    function showMathEditor($img) {
        $img.hide()
        $img.after($mathEditorContainer)
        visible = true
        toggleMathToolbar(true)
        setTimeout(() => mqInstance.focus(), 0)
        $latexField.val($img.prop('alt'))
        onLatexUpdate()
        u.scrollIntoView($mathEditorContainer)
    }

    function insertMath(symbol, alternativeSymbol, useWrite) {
        if (focus.latexField) {
            u.insertToTextAreaAtCursor($latexField.get(0), alternativeSymbol || symbol)
            onLatexUpdate()
        } else if (focus.equationField) {
            if (useWrite) {
                mqInstance.write(symbol)
            } else {
                mqInstance.typedText(symbol)
            }
            if (~symbol.indexOf('\\')) mqInstance.keystroke('Tab')
            setTimeout(() => mqInstance.focus(), 0)
        }
    }

    function updateMathImg($img, latex) {
        $img.prop({
            src: '/math.svg?latex=' + encodeURIComponent(latex),
            alt: latex
        })
        $img.closest('[data-js="answer"]').trigger('input')
    }

    function updateMathImgWithDebounce($img, latex) {
        clearTimeout(updateMathImgTimeout)
        updateMathImgTimeout = setTimeout(() => {
            updateMathImg($img, latex)
        }, 500)
    }

    function closeMathEditor(setFocusAfterClose = false) {
        const $currentEditor = $mathEditorContainer.closest('[data-js="answer"]')
        const $img = $mathEditorContainer.prev()
        if ($latexField.val().trim() === '') {
            $img.remove()
        } else {
            $img.show()
            updateMathImg($img, $latexField.val())
        }

        toggleMathToolbar(false)
        $outerPlaceholder.append($mathEditorContainer)
        visible = false
        focus.latexField = false
        focus.equationField = false
        if (setFocusAfterClose) $currentEditor.focus()
    }

    function toggleMathToolbar(isVisible) {
        $('body').toggleClass('math-editor-focus', isVisible)
    }
}
