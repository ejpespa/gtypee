import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { WorkspaceReportCommandDeps, DeletedUser, DeletedUserOptions } from './commands.js';

export interface DeletedUsersTuiProps {
  reportDeps: Required<WorkspaceReportCommandDeps>;
  days: number;
  searchOpts: DeletedUserOptions;
  onCancel?: () => void;
}

export function DeletedUsersTui({ reportDeps, days, searchOpts, onCancel }: DeletedUsersTuiProps) {
  const { exit } = useApp();
  
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([searchOpts.pageToken]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasNextPage, setNextPageAvailable] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryOpts: any = { ...searchOpts };
        if (pageHistory[currentIndex]) { queryOpts.pageToken = pageHistory[currentIndex]; } else { delete queryOpts.pageToken; }
        const result = await reportDeps.getDeletedUsers(days, queryOpts);
        
        if (!isCancelled) {
          setUsers(result.items);
          if (result.nextPageToken) {
            setNextPageAvailable(true);
            setPageHistory(prev => {
              const next = [...prev];
              next[currentIndex + 1] = result.nextPageToken;
              return next;
            });
          } else {
            // Even if there's no next page token, if we fetched a full page, 
            // the user might still legitimately be parsing through the cached page arrays!
            setNextPageAvailable(false);
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
  }, [currentIndex, days, reportDeps]); // REMOVED pageHistory / searchOpts specifically from deps to prevent infinite re-rendering!

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      if (onCancel) return onCancel();
      exit();
      return;
    }
    
    if (!loading) {
      if ((key.rightArrow || input === ' ') && hasNextPage) {
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
      
      {loading && users.length === 0 ? (
        <Text color="yellow">Loading records from Google Workspace API...</Text>
      ) : users.length === 0 ? (
        <Text color="gray">No deleted users found on this page.</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          {users.map((user, i) => {
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
        <Text color={hasNextPage && !loading ? "green" : "gray"}>[Next →]</Text>
        <Text color="gray"> | press 'q' to quit (Page {currentIndex + 1}){loading ? ' | Loading...' : ''}</Text>
      </Box>
    </Box>
  );
}
