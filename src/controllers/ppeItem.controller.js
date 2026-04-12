const prisma = require('../config/prisma');

// ─── GET /api/ppe-items ──────────────────────────────────
const getAllPpeItems = async (req, res, next) => {
  try {
    const items = await prisma.ppeItem.findMany({
      orderBy: { id: 'asc' },
    });

    res.json({
      success: true,
      data: items.map((item) => ({
        id: item.id,
        item_key: item.itemKey,
        display_name: item.displayName,
        icon_name: item.iconName,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPpeItems,
};
