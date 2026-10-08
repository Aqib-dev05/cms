export interface Program {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  department: { name: string; code: string };
}
