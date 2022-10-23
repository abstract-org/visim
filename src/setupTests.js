// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { JSDOM } from 'jsdom'

const dom = new JSDOM()
global.document = dom.window.document
global.window = dom.window
