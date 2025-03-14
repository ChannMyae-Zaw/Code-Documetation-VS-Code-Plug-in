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
            symbolTree.push(this.extractSymbolTree(symbol));
        });
        console.log("symbolTree: ", symbolTree)
        return symbolTree;
    }

    private static extractSymbolTree(symbol: vscode.DocumentSymbol): any {
        return {
            name: symbol.name,
            kind: vscode.SymbolKind[symbol.kind], // Convert kind to readable string
            line: symbol.range.start.line + 1, // Convert zero-based to one-based line number
            children: symbol.children.map(child => this.extractSymbolTree(child))
        };
    }
}
