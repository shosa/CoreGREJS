export interface TrackType {
  id: number;
  name: string;
  note?: string;
}

export interface TrackLink {
  id: number;
  cartellino: number;
  lotto: string;
  typeId?: number;
  type?: TrackType;
  note?: string;
  data?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackLotInfo {
  lotto: string;
  cliente?: string;
  ordine?: number;
  articolo?: string;
  quantita?: number;
  note?: string;
}

export interface TrackOrderInfo {
  id: number;
  ordine: number;
  date?: Date;
}

export interface TrackSku {
  id: number;
  articolo: string;
  sku: string;
  note?: string;
}

export interface SearchDataParams {
  lotto?: string;
  cartellino?: number;
  cliente?: string;
  ordine?: number;
  articolo?: string;
  sku?: string;
}

export interface TreeNode {
  lotto: string;
  cartellini: number[];
  children: TreeNode[];
  parent?: string;
}

export interface LotDetail {
  lotto: string;
  info?: TrackLotInfo;
  links: TrackLink[];
  cartellini: number[];
}
