import React from 'react'
import AceEditor from 'react-ace'

import 'ace-builds/src-noconflict/ext-language_tools'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-monokai'

export const AceEditorWrapped = (props) => {
    return (
        <AceEditor
            mode="json"
            theme="monokai"
            onChange={props.onChange}
            onBlur={(e, code) => props.onBlur(code.getValue())}
            name="editorInv"
            editorProps={{ $blockScrolling: true }}
            fontSize={18}
            highlightActiveLine={true}
            enableBasicAutocompletion={false}
            enableLiveAutocompletion={false}
            value={props.state}
        />
    )
}