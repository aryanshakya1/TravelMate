import { Messages, Groups, Travellers, getTravellersMap } from '../models/db.js';

export const getGroupMessages = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const group = Groups.findOne(g => g.group_id === groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const messages = Messages.find(m => m.group_id === groupId);
    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const sendGroupMessage = (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { sender_id, senderId, text } = req.body;

    const group = Groups.findOne(g => g.group_id === groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const finalSenderId = (sender_id || senderId || '').trim();
    if (!finalSenderId) {
      return res.status(400).json({ success: false, error: 'Sender ID is required.' });
    }

    if (!(group.member_ids || []).includes(finalSenderId)) {
      return res.status(403).json({ success: false, error: 'Only approved members can participate in group discussions.' });
    }

    const messageText = (text || '').trim();
    if (!messageText) {
      return res.status(400).json({ success: false, error: 'Message text cannot be empty.' });
    }

    const travellersMap = getTravellersMap();
    const sender = travellersMap[finalSenderId];
    const senderName = sender ? sender.name : finalSenderId;

    const newMsg = {
      message_id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      group_id: groupId,
      sender_id: finalSenderId,
      sender_name: senderName,
      text: messageText,
      created_at: new Date().toISOString()
    };

    Messages.insert(newMsg);

    res.status(201).json({
      success: true,
      message: newMsg
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
