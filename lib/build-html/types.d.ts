export type BuildHtmlOptions =
{
    minify?: boolean;
    mode?: "inline"; // in the future, we will support chunking
}

export type BuildHtmlFunction = (input: string, output: string, options: BuildHtmlOptions) => Promise<string>;