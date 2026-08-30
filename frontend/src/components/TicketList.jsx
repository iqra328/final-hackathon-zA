import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/global.css';
import '../styles/TicketList.css';



const TicketList = ({ tickets, title }) => {
  const getStatusColor = (status) => {
    const colors = {
      'New': 'bg-blue-500',
      'Assigned': 'bg-yellow-500',
      'In Progress': 'bg-purple-500',
      'Resolved': 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'High': 'text-red-600',
      'Medium': 'text-yellow-600',
      'Low': 'text-green-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  if (!tickets || tickets.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-gray-500">No tickets found</p>
      </div>
    );
  }

  return (
    <div>
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Link 
            key={ticket._id} 
            to={`/ticket/${ticket._id}`}
            className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition ticket-card"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className={`text-sm font-semibold ${getPriorityColor(ticket.priority)}`}>
                    ⚡ {ticket.priority}
                  </span>
                  <span className="text-xs text-gray-500">
                    #{ticket.ticketNumber}
                  </span>
                </div>
                <h3 className="font-semibold">{ticket.subject}</h3>
                <p className="text-sm text-gray-600">
                  {ticket.category} • {ticket.messages?.length || 0} messages
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm text-gray-400">
                {ticket.agentId ? '👤 Agent assigned' : '⏳ Waiting for agent'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TicketList;