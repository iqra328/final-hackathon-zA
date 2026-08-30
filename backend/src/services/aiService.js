const axios = require('axios');

const CATEGORIES = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting', 'General'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

async function analyzeTicket(subject, description) {
  try {
    // Mock analysis - always return valid data
    return getMockAnalysis(subject, description);
  } catch (error) {
    console.error('AI Service error:', error.message);
    return getMockAnalysis(subject, description);
  }
}

function getMockAnalysis(subject, description) {
  const text = (subject + ' ' + description).toLowerCase();
  
  let category = 'General';
  let priority = 'Medium';
  
  // Category detection - only use valid categories
  if (text.includes('plumb') || text.includes('pipe') || text.includes('water') || 
      text.includes('leak') || text.includes('faucet') || text.includes('drain') ||
      text.includes('tap') || text.includes('sink') || text.includes('toilet')) {
    category = 'Plumbing';
    priority = 'High';
  } else if (text.includes('electr') || text.includes('wiring') || text.includes('circuit') || 
             text.includes('light') || text.includes('socket') || text.includes('power') ||
             text.includes('shock') || text.includes('short') || text.includes('fuse') ||
             text.includes('switch') || text.includes('bulb')) {
    category = 'Electrical';
    priority = 'High';
  } else if (text.includes('carpent') || text.includes('wood') || text.includes('cabinet') || 
             text.includes('door') || text.includes('shelf') || text.includes('furniture') ||
             text.includes('drawer') || text.includes('hinge') || text.includes('frame') ||
             text.includes('table') || text.includes('chair')) {
    category = 'Carpentry';
    priority = 'Medium';
  } else if (text.includes('clean') || text.includes('dust') || text.includes('sweep') || 
             text.includes('mop') || text.includes('vacuum') || text.includes('hygiene') ||
             text.includes('sanitize') || text.includes('disinfect') || text.includes('tidy') ||
             text.includes('organize') || text.includes('sparkle')) {
    category = 'Cleaning';
    priority = 'Low';
  } else if (text.includes('paint') || text.includes('wall') || text.includes('color') || 
             text.includes('brush') || text.includes('roller') || text.includes('coating') ||
             text.includes('spray') || text.includes('primer') || text.includes('stain') ||
             text.includes('varnish') || text.includes('finish')) {
    category = 'Painting';
    priority = 'Medium';
  } else if (text.includes('billing') || text.includes('charge') || text.includes('payment') || 
             text.includes('refund') || text.includes('invoice') || text.includes('bill') ||
             text.includes('double') || text.includes('twice') || text.includes('overcharge')) {
    category = 'General';
    priority = 'High';
  } else if (text.includes('shipping') || text.includes('delivery') || text.includes('order') || 
             text.includes('tracking') || text.includes('package') || text.includes('courier') ||
             text.includes('shipment') || text.includes('dispatch')) {
    category = 'General';
    priority = 'Medium';
  } else if (text.includes('login') || text.includes('password') || text.includes('account') ||
             text.includes('profile') || text.includes('update') || text.includes('email') ||
             text.includes('username') || text.includes('access')) {
    category = 'General';
    priority = 'Medium';
  } else if (text.includes('technical') || text.includes('error') || text.includes('bug') ||
             text.includes('crash') || text.includes('not working') || text.includes('issue') ||
             text.includes('problem') || text.includes('fault')) {
    category = 'General';
    priority = 'High';
  }
  
  // Priority detection
  if (text.includes('urgent') || text.includes('asap') || text.includes('immediately') || 
      text.includes('emergency') || text.includes('critical') || text.includes('high priority') ||
      text.includes('serious') || text.includes('severe') || text.includes('danger') ||
      text.includes('now') || text.includes('quick')) {
    priority = 'Urgent';
  } else if (text.includes('minor') || text.includes('small') || text.includes('simple') || 
             text.includes('not urgent') || text.includes('low priority') ||
             text.includes('suggestion') || text.includes('query') || text.includes('question') ||
             text.includes('help') || text.includes('guide')) {
    priority = 'Low';
  }
  
  // Summary
  const summary = description.length > 80 ? description.substring(0, 80) + '...' : description;
  
  return { category, priority, summary };
}

module.exports = { analyzeTicket };