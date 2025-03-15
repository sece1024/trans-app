const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const ContentItem = sequelize.define('Content', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'ContentItem ID'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Text Contenti or Image Path'
    },
    type: {
        type: DataTypes.STRING, // 可以是 'text', 'image' 等
        allowNull: false,
        comment: 'Text or Image'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Create Time',
    },
    deviceInfo: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = ContentItem;