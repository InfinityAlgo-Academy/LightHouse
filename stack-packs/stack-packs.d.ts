interface Pack {
  id: string;
  iconDataURL: string;
  title: string;
  descriptions: Record<string, string>;
}

declare const stackPacks: Pack[];

export = stackPacks;
