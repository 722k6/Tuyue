import { EnergyType, type EnergyType as EnergyTypeValue } from '@tuyue/contracts';

/** 能源类型的中文展示名。接口里是英文枚举，页面上不能直接把它摊给访客看。 */
const ENERGY_LABELS: Record<EnergyTypeValue, string> = {
  [EnergyType.GASOLINE]: '汽油',
  [EnergyType.HYBRID]: '混动',
  [EnergyType.ELECTRIC]: '纯电',
};

export function energyLabel(type: EnergyTypeValue): string {
  return ENERGY_LABELS[type];
}
