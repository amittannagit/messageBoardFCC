'use strict';
const express = require('express');
const router = express.Router();
const Thread = require('../models/thread');
const mongoose = require('mongoose');

module.exports = function (app) {

  // Route for handling threads
  app.route('/api/threads/:board')
    // POST: Create a new thread
    .post(async (req, res) => {
      try {
        const { text, delete_password } = req.body;
        const board = req.params.board;

        // Validate input
        if (!text || !delete_password || !board) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create new thread
        const newThread = new Thread({
          text,
          delete_password,
          board,
          created_on: new Date(),
          bumped_on: new Date(),
          reported: false,
          replies: []
        });

        // Save the thread to the database
        const savedThread = await newThread.save();

        // Return the required fields of the saved thread
        res.json({
          _id: savedThread._id,
          text: savedThread.text,
          created_on: savedThread.created_on,
          bumped_on: savedThread.bumped_on,
          replies: [] // Start with an empty replies array
        });

      } catch (error) {
        console.error('Error creating thread:', error);
        res.status(500).json({ error: 'An error occurred while creating the thread' });
      }
    })
    // GET: Retrieve threads for a board
    .get(async (req, res) => {
      try {
        const board = req.params.board;

        // Fetch the 10 most recent threads sorted by bumped_on, and limit replies to 3
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 }) // Sort by bumped_on in descending order
          .limit(10) // Limit to 10 threads
          .lean() // Fetch documents as plain JavaScript objects
          .select('-delete_password -reported'); // Exclude delete_password and reported fields from threads

        // Map over the threads to return only the most recent 3 replies and exclude sensitive fields
        const filteredThreads = threads.map(thread => {
          const { replies, ...restOfThread } = thread;

          // Limit replies to the most recent 3, exclude delete_password and reported from replies
          const recentReplies = replies
            .slice(-3) // Get the last 3 replies
            .map(({ _id, text, created_on }) => ({ _id, text, created_on })); // Exclude sensitive fields

          return {
            ...restOfThread,
            replies: recentReplies // Include only the 3 most recent replies
          };
        });

        res.json(filteredThreads);

      } catch (error) {
        console.error('Error fetching threads:', error);
        res.status(500).json({ error: 'An error occurred while fetching threads' });
      }
    })
    // PUT: Report a thread
    .put(async (req, res) => {
      try {
        const { thread_id } = req.body;
        const board = req.params.board;
      
        if (!thread_id) {
          return res.status(400).json({ error: 'Missing required field: thread_id' });
        }
      
        // Find the thread and update its reported status
        const updatedThread = await Thread.findOneAndUpdate(
          { _id: thread_id, board },
          { $set: { reported: true } },
          { new: true }
        );
      
        if (!updatedThread) {
          return res.status(404).json({ error: 'Thread not found' });
        }
      
        res.send('reported');
      } catch (error) {
        console.error('Error reporting thread:', error);
        res.status(500).json({ error: 'An error occurred while reporting the thread' });
      }
    })
    // DELETE: Delete a thread
    .delete(async (req, res) => {
      try {
        const { thread_id, delete_password } = req.body;
        const board = req.params.board;
        
        // Validate input
        if (!delete_password || !thread_id) {
          return res.status(400).json({ error: 'missing fields' });
        }

        // Find the thread by thread_id and board
        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        // Check if the provided delete_password matches
        if (thread.delete_password !== delete_password) {
          return res.status(200).send('incorrect password');
        }

        // Delete the thread
        await Thread.deleteOne({ _id: thread_id });

        // Return success message
        return res.send('success');
      } catch (error) {
        console.error('Error deleting thread:', error);
        res.status(500).json({ error: 'An error occurred while deleting the thread' });
      }
    });

  // Route for handling replies
  app.route('/api/replies/:board')
    // POST: Add a new reply to a thread
    .post(async (req, res) => {
      try {
        const { thread_id, text, delete_password } = req.body;
        const board = req.params.board;
    
        // Validate input
        if (!thread_id || !text || !delete_password) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
    
        // Find the thread by thread_id and board
        const thread = await Thread.findOne({ _id: thread_id, board });
    
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }
    
        // Create the new reply object as an embedded document
        const newReply = {
          text,
          delete_password,
          created_on: new Date(),
          reported: false,
        };
    
        // Add the reply to the thread's replies array and update the bumped_on field
        thread.replies.push(newReply);
        thread.bumped_on = newReply.created_on;
    
        // Save the updated thread
        await thread.save();
    
        // Return the new reply with its details
        res.json({
          _id: thread.replies[thread.replies.length - 1]._id,
          text: newReply.text,
          created_on: newReply.created_on,
        });
        
      } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ error: 'An error occurred while adding the reply' });
      }
    })
    // GET: Retrieve replies for a specific thread
    .get(async (req, res) => {
      try {
        const { thread_id } = req.query; // Make sure thread_id is passed as a query parameter
        const board = req.params.board;

        // Validate input
        if (!thread_id) {
          return res.status(400).json({ error: 'Missing required field: thread_id' });
        }

        // Find the thread by thread_id and board, excluding sensitive fields
        const thread = await Thread.findOne({ _id: thread_id, board })
          .select('-delete_password -reported -replies.delete_password -replies.reported');

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        // Return the thread with its replies
        res.json(thread);
        
      } catch (error) {
        console.error('Error retrieving replies:', error);
        res.status(500).json({ error: 'An error occurred while retrieving replies' });
      }
    })
    // PUT: Report a reply
    .put(async (req, res) => {
      try {
        const { thread_id, reply_id } = req.body;
        const board = req.params.board;

        // Validate input
        if (!thread_id || !reply_id) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Find the thread by thread_id and board
        const thread = await Thread.findOne({ _id: thread_id, board });

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        // Find the reply in the thread's replies
        const reply = thread.replies.id(reply_id);

        if (!reply) {
          return res.status(404).json({ error: 'Reply not found' });
        }

        // Mark the reply as reported
        reply.reported = true;
        await thread.save();

        res.send('reported');
      } catch (error) {
        console.error('Error reporting reply:', error);
        res.status(500).json({ error: 'An error occurred while reporting the reply' });
      }
    })
    // DELETE: Delete a reply
    .delete(async (req, res) => {
      try {
        const { thread_id, reply_id, delete_password } = req.body;
        const board = req.params.board;
    
        // Validate input
        if (!thread_id || !reply_id || !delete_password) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
    
        // Find the thread
        const thread = await Thread.findOne({ _id: thread_id, board });
    
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }
    
        // Find the reply within the thread
        const reply = thread.replies.id(reply_id);
    
        if (!reply) {
          return res.status(404).json({ error: 'Reply not found' });
        }
    
        // Check if the provided delete_password matches the stored one
        if (reply.delete_password !== delete_password) {
          return res.status(200).send('incorrect password');
        }

        // Mark the reply as deleted by changing its text
        reply.text = '[deleted]';
        await thread.save(); // Save the updated thread
    
        // Return success message with 200 OK status
        res.send('success'); // Indicate successful deletion
      } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({ error: 'An error occurred while deleting the reply' });
      }
    });
};