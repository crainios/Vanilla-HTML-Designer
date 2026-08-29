import HtmlDesigner from '../Vanilla-HTML-Designer/src/HtmlDesigner.js';
import TestPlugin from './index.js';

const editor = new HtmlDesigner('#htmlDesigner', {
    plugins: [
        TestPlugin
    ],

    defaultFontFamily: 'Verdana, Arial, sans-serif'
});

window.editor = editor;

console.log(
    'Plugins VHD chargés :',
    editor.getPlugins()
);
