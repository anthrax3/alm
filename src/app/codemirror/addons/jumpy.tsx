import React = require("react");
import ReactDOM = require("react-dom");
import Radium = require('radium');
import csx = require('csx');
import * as utils from "../../../common/utils";
import * as styles from "../../styles/styles";
import * as state from "../../state/state";
import * as ui from "../../ui";
import * as uix from "../../uix";
import * as commands from "../../commands/commands";
import CodeMirror = require('codemirror');
import Modal = require('react-modal');

require('./jumpy.css');

let lowerCharacters = [];
for (let i = 'a'.charCodeAt(0); i < 'z'.charCodeAt(0); i++) {
    lowerCharacters.push(String.fromCharCode(i));
}
let keys: string[] = []
for (let c1 of lowerCharacters) {
    for (let c2 of lowerCharacters) {
        keys.push(c1 + c2);
    }
}

type Editor = CodeMirror.EditorFromTextArea;

interface JumpyState {
    overlay?: HTMLDivElement;
}

function getState(cm:Editor): JumpyState{
    return (cm as any).state.jumpy || ((cm as any).state.jumpy = {});
}

function createOverlay(cm: Editor) {
    let doc = cm.getDoc();
    let {from,to} = cm.getViewport();
    let text = cm.getDoc().getRange({line:from,ch:0},{line:to,ch:0});
    let splitRegex = /^[A-Z]?[0-9a-z]+|^[\{\};]+/;

    let node = document.createElement('div');
    let scrollInfo = cm.getScrollInfo();
    let topLine = cm.coordsChar({top:scrollInfo.top,left: scrollInfo.left}, 'local').line;
    let bottomLine = cm.coordsChar({ top: scrollInfo.top + scrollInfo.clientHeight, left: scrollInfo.left }, 'local').line + 1;
    // console.log(scrollInfo,bottomLine-topLine);
    let lines = [];
    for (let i = 0; i < bottomLine - topLine; i++) {
        lines.push(i);
    }

    let keysIndex = 0;

    let overlayByLines = utils.selectMany(lines.map((x)=>{
        function getPxPos(line:number,ch:number){
            let pxPos = cm.charCoords({line:line,ch:ch},"local");
            return {top:pxPos.top - 20 , left: pxPos.left};
        }

        let trueLine = x + topLine;
        let string = doc.getLine(trueLine);

        let pos = 0;
        let lineOverlays = [];
        while (pos !== string.length) {
            var matches = /^[A-Z]?[0-9a-z]+|^[\{\};]+/.exec(string.substr(pos));
            if (matches && matches.length) {
                let matched = matches[0];
                pos += matched.length;
                console.log('here', matched, pos);
                let name = keys[keysIndex++];
                lineOverlays.push(<div>{name}</div>);
            } else {
                pos++;
            }
        }

        return [<div key={x} className="cm-jumpy" style={{top:`${getPxPos(x,0).top}px`} as any}>{x}</div>]
    }));

    let overlay = ReactDOM.render(<div>
        {overlayByLines}
    </div>,node);

    return node;
}

function clearAnyOverlay(cm: Editor) {
    if (getState(cm).overlay) {
        getState(cm).overlay.parentElement.removeChild(getState(cm).overlay);
        getState(cm).overlay = null;
    }
}

function addOverlay(cm: Editor) {
    clearAnyOverlay(cm);
    let overlay = getState(cm).overlay = createOverlay(cm);

    let scrollInfo = cm.getScrollInfo();
    let pos = cm.coordsChar({top:scrollInfo.top,left: scrollInfo.left}, 'local');

    cm.addWidget(pos, overlay, false);
}

// Wire up the code mirror command to come here
CodeMirror.commands[commands.additionalEditorCommands.jumpy] = (editor: CodeMirror.EditorFromTextArea) => {
    let cursor = editor.getDoc().getCursor();
    let filePath = editor.filePath;
    let position = editor.getDoc().indexFromPos(cursor);

    // Subscribe to esc *once* to clear
    commands.esc.once(()=>{
        clearAnyOverlay(editor);
    });


    addOverlay(editor);
}