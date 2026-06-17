import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { WorkspaceReportCommandDeps, DeletedUser, DeletedUserOptions, WorkspaceUserCommandDeps } from './commands.js';

export interface DeletedUsersTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  userDeps: Required<WorkspaceUserCommandDeps>;
  days: number;
  searchOpts: DeletedUserOptions;
  onCancel?: () => void;
}

export function DeletedUsersTui({ reportDeps, userDeps, days, searchOpts, onCancel }: DeletedUsersTuiProps) {
  const { exit } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // pageHistory holds tokens. pageHistory[0] is the initial token.
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([searchOpts.pageToken]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Only caching the CURRENT page of exactly 20 users so it's super lean!
  const [currentViewUsers, setCurrentViewUsers] = useState<DeletedUser[]>([]);
  const pageSize = searchOpts.pageSize || 20;

  useEffect(() => {
    let isCancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        let currentToken = pageHistory[currentIndex];
        
        const queryOpts: any = { ...searchOpts, pageSize };
        if (currentToken) { queryOpts.pageToken = currentToken; } else { delete queryOpts.pageToken; }
        
        // This will only ask for exactly 20 users from runtime.ts, which correctly handles the offset loops!
        const result = await reportDeps.getDeletedUsers(days, queryOpts);
        
        if (!isCancelled) {
          setCurrentViewUsers(result.items);
          
          if (result.nextPageToken) {
            setPageHistory(prev => {
              const next = [...prev];
              next[currentIndex + 1] = result.nextPageToken;
              return next;
            });
          } else {
             // Wipe any forward tokens ensuring it terminates cleanly
             setPageHistory(prev => {
               const next = [...prev];
               if (next.length > currentIndex + 1) {
                 next[currentIndex + 1] = undefined;
               }
               return next;
             });
          }
        }
      } catch (err: any) {
        if (!isCancelled) setError(err.message || "Failed to fetch users");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    
    fetchPage();
    return () => { isCancelled = true; };
  }, [currentIndex, days, reportDeps]);

  // If there's a valid token queued in history for the next page, we can go right!
  const localHasNextPage = pageHistory[currentIndex + 1] !== undefined;

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (onCancel) return onCancel();
      exit();
      return;
    }
    
    if (!loading) {
      if ((key.rightArrow || input === ' ') && localHasNextPage) {
        setCurrentIndex(prev => prev + 1);
      }
      if (key.leftArrow && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Deleted Users (Last {days} days)</Text>
      </Box>

      {error && (
        <Box marginBottom={1}><Text color="red">Error: {error}</Text></Box>
      )}
      
      {loading && currentViewUsers.length === 0 ? (
        <Text color="yellow">Loading records from Google Workspace API...</Text>
      ) : currentViewUsers.length === 0 ? (
        <Text color="gray">No deleted users found on this page.</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          {currentViewUsers.map((user: DeletedUser, i: number) => {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
            const namePart = fullName ? ` (${fullName})` : "";
            return (
              <Text key={user.userEmail + i}>
                <Text color="white">{user.userEmail}</Text>
                <Text color="green">{namePart}</Text>
                <Text color="gray"> - deleted {user.deletionTime}</Text>
              </Text>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">Navigation: </Text>
        <Text color={currentIndex > 0 && !loading ? "green" : "gray"}>[← Prev]</Text>
        <Text color="gray">  </Text>
        <Text color={localHasNextPage && !loading ? "green" : "gray"}>[Next →]</Text>
        <Text color="gray"> | press 'q' to quit (Page {currentIndex + 1}){loading ? ' | Loading...' : ''}</Text>
      </Box>
    </Box>
  );
}
