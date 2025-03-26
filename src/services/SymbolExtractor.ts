import * as vscode from 'vscode';

export class SymbolExtractor {
    public static async getSymbols(document: vscode.TextDocument): Promise<any[]> {
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols) {
            console.log("No symbols found");
            return [];
        }

        const symbolTree: any[] = [];
        symbols.forEach(symbol => {
            symbolTree.push(this.extractSymbolTree(symbol, document.uri)); // Pass the document URI
        });
        console.log("symbolTree: ", symbolTree);
        return symbolTree;
    }

    private static extractSymbolTree(symbol: vscode.DocumentSymbol, uri: vscode.Uri): any { // Add URI parameter
        return {
            name: symbol.name,
            kind: vscode.SymbolKind[symbol.kind],
            range: {
                start: { line: symbol.range.start.line, character: symbol.range.start.character },
                end: { line: symbol.range.end.line, character: symbol.range.end.character }
            },
            position: symbol.selectionRange.start, // Add position
            uri: uri, // Add uri
            children: symbol.children.map(child => this.extractSymbolTree(child, uri)) // Pass uri to children
        };
    }
}