import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  findSimilarTickets,
  detectOutbreaks,
  getDynamicPriorityList,
  getAgentExpertise,
  suggestBestAgent,
  getResolutionSuggestions,
} from '../services/intelligence';

const router = Router();

// GET /api/intelligence/similar/:ticketId — Find tickets with similar DNA
router.get('/similar/:ticketId', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const similar = await findSimilarTickets(ticketId);
    res.json({ similar, ticketId });
  } catch (err) {
    console.error('Intelligence - similar:', err);
    res.status(500).json({ error: 'Failed to find similar tickets' });
  }
});

// GET /api/intelligence/outbreaks — Detect ticket clusters/incidents
router.get('/outbreaks', requireAuth, async (req: Request, res: Response) => {
  try {
    const outbreaks = await detectOutbreaks();
    res.json(outbreaks);
  } catch (err) {
    console.error('Intelligence - outbreaks:', err);
    res.status(500).json({ error: 'Failed to detect outbreaks' });
  }
});

// GET /api/intelligence/dynamic-priority — Tickets ranked by time-decay urgency
router.get('/dynamic-priority', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const tickets = await getDynamicPriorityList(limit);
    res.json(tickets);
  } catch (err) {
    console.error('Intelligence - dynamic priority:', err);
    res.status(500).json({ error: 'Failed to get dynamic priority' });
  }
});

// GET /api/intelligence/expertise — Agent expertise radar data
router.get('/expertise', requireAuth, async (req: Request, res: Response) => {
  try {
    const expertise = await getAgentExpertise();
    res.json(expertise);
  } catch (err) {
    console.error('Intelligence - expertise:', err);
    res.status(500).json({ error: 'Failed to get agent expertise' });
  }
});

// GET /api/intelligence/suggest-agent/:ticketId — Best agent for a ticket
router.get('/suggest-agent/:ticketId', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const suggestions = await suggestBestAgent(ticketId);
    res.json({ suggestions, ticketId });
  } catch (err) {
    console.error('Intelligence - suggest agent:', err);
    res.status(500).json({ error: 'Failed to suggest agent' });
  }
});

// GET /api/intelligence/resolution/:ticketId — Past resolution suggestions
router.get('/resolution/:ticketId', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const suggestions = await getResolutionSuggestions(ticketId);
    res.json({ suggestions, ticketId });
  } catch (err) {
    console.error('Intelligence - resolution:', err);
    res.status(500).json({ error: 'Failed to get resolution suggestions' });
  }
});

export default router;
