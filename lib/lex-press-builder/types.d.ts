export interface ToBuildedObjectStack
{
    [route: string]: {
        html: string;
        serverPropsModule: string;
    }
}