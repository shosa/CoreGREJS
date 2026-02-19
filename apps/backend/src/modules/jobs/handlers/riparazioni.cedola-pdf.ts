import { PrismaClient } from '@prisma/client';
import { JobHandler } from '../types';
import handlerV1 from './riparazioni.cedola-pdf-v1';
import handlerV2 from './riparazioni.cedola-pdf-v2';

const prisma = new PrismaClient();

/**
 * Dispatcher: legge l'impostazione riparazioni.layoutStampa dal DB
 * e delega al template originale (v1) o al template nuovo landscape (v2).
 * Default: 'nuovo' (v2).
 */
const handler: JobHandler = async (payload, helpers) => {
  const setting = await prisma.setting.findUnique({
    where: { key: 'riparazioni.layoutStampa' },
  });

  const layout = setting?.value ?? 'nuovo';

  if (layout === 'originale') {
    return handlerV1(payload, helpers);
  }

  return handlerV2(payload, helpers);
};

export default handler;
