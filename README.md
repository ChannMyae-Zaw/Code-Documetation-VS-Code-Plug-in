# code-documentation README

This is the README for your extension "code-documentation". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**





###### Project Explannation
{ Assuming you have studied documentation and the video on extension fairly well, which you should have by now}

### Running

1. in the [webview-ui], run "npm run build". 
2. Then Fn + F5 to run the extension and text it in the extension window. Right now the icon is blank so, it should at the bottomost of the activity bar without the icon. so just blank. click it to see the primary sidebar.
3. Make a code file or open an existing folder to test.


Dont forget to run the backend too


### code explaining 

# The src folder 

 contain every code related to working with VS code parts, such as editors, sidebars, views, status bars etc.

* resources folder are for icons, images.
* services folder now contain backend service which handles connection with the OpenAIapi and DiffService that handles showing the difference of the code and editing the code with the modified one.
* sidebars folder contain PrimarySidebar.ts which integrates the primary sidebar.ts in the extension.
    it is currently connected with svelte app( which will be explained below) to show the webview UIs.
* test is default.
* utils include the existing method of asking for user inputs ( api key, level, code )

# webview-ui folder

    This is javascript app that will work embedded in the extension to handle Userinterfaces, state changes, routings etc. 
    This works the same for the extension as the angular does for the webapp.

* The src folder is where the main app is. components folder is created for better organization of code and decoupling of vs code    parts, primarysidebar, secondary sidebar.
If you run the app it builds the app in the webview-ui/public folder and index.html and other js file will be generated. The index.html is connected with PrimarySidebar.ts to connect the app with the extension. The Ui in App.svelte will be working.


### To-Do ( or what we can do)

* Primary sidebar - System to ask input and store api and file through the 
* Secondary sidebar or terminal space - system to implement this: if the response is recieved and the diffview is opened up, show the list of changes made to the code together with line number of code, to navigate to that line, and option to edit the variable and method name in other files if the changed method or variable is used in those files.

