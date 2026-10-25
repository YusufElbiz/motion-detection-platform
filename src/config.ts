export type Category = 'plastic' | 'paper' | 'glass' | 'metal';
export const categories: Record<Category, {label: string; color: string; name: string}> = {
  plastic: {label: 'PLASTİK', color: '#f7cf54', name: 'Plastik şişe'},
  paper: {label: 'KAĞIT', color: '#77b8ed', name: 'Kağıt'},
  glass: {label: 'CAM', color: '#85c998', name: 'Cam şişe'},
  metal: {label: 'METAL', color: '#b6c2cd', name: 'Metal kutu'},
};
export const categoryIds = Object.keys(categories) as Category[];
// Logical playfield is always 1280 × 720. Speeds are logical pixels / second.
export const config = {width: 1280, height: 720, goal: 8, difficulties: {
  relaxed: {speed: 30, interval: 4.5, maxObjects: 3},
  normal: {speed: 55, interval: 3.5, maxObjects: 4},
}};
export type Difficulty = keyof typeof config.difficulties;
