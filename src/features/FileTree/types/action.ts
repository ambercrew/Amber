export interface Action {
    iconName: string;
    text: string;
    shortcut?: string;
    onClick: () => void;
}

