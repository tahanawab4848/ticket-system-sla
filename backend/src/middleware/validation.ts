import { Request, Response, NextFunction } from 'express';

export function validateTicket(req: Request, res: Response, next: NextFunction) {
  const { title, description, priority } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!priority || !validPriorities.includes(priority)) {
    return res.status(400).json({ error: `Priority must be one of: ${validPriorities.join(', ')}` });
  }

  next();
}

export function validateTicketUpdate(req: Request, res: Response, next: NextFunction) {
  const { status, priority, assigned_to } = req.body;

  if (status) {
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }
  }

  if (priority) {
    const validPriorities = ['low', 'medium', 'high', 'critical', 'escalated'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of: ${validPriorities.join(', ')}` });
    }
  }

  if (assigned_to !== undefined && assigned_to !== null && isNaN(Number(assigned_to))) {
    return res.status(400).json({ error: 'assigned_to must be a valid user ID' });
  }

  next();
}
