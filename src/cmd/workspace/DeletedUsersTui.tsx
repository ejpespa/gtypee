import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
  DEFAULT_TUI_PAGE_SIZE,
  mergeNextPageToken,
  hasNextTokenPage,
  shouldHandlePaginationKey,
} from '../tui/pagination.js';
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
    const [selectedUserToRecover, setSelectedUserToRecover] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  const pageSize = searchOpts.pageSize || DEFAULT_TUI_PAGE_SIZE;

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
          
          setPageHistory((prev) =>
            mergeNextPageToken(prev, currentIndex, result.nextPageToken),
          );
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
  const localHasNextPage = hasNextTokenPage(pageHistory, currentIndex);

    const handleSelectUser = (item: any) => {
    setSelectedUserToRecover(item.value);
    setRecoveryStatus(null);
    setConfirmInput(''); // reset input on selection display
  };

  const handleRecoveryConfirm = async (val: string) => {
    if (val.trim().toLowerCase() === 'y' && selectedUserToRecover) {
      setIsRecovering(true);
      try {
        const result = await userDeps.recoverUser(selectedUserToRecover);
        setRecoveryStatus(result.applied ? "Successfully recovered!" : "Failed to recover user.");
      } catch (e: any) {
        setRecoveryStatus(`Error: ${e.message}`);
      }
      setIsRecovering(false);
    } else if (val.trim().toLowerCase() !== 'y') {
      // If they type anything else and hit enter, abort gracefully
      setSelectedUserToRecover(null);
      setConfirmInput('');
    }
  };

  useInput((input, key) => {
    if (selectedUserToRecover !== null) {
      if (key.escape) {
        setSelectedUserToRecover(null);
        setRecoveryStatus(null);
        setConfirmInput('');
      }
    } else if (input === 'q' || key.escape) {
      if (onCancel) return onCancel();
      exit();
      return;
    }

    if (loading) return;

    const action = shouldHandlePaginationKey(
      input,
      key,
      selectedUserToRecover !== null,
    );
    if (action === 'next' && localHasNextPage) setCurrentIndex((i) => i + 1);
    if (action === 'prev' && currentIndex > 0) setCurrentIndex((i) => i - 1);
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Box marginBottom={1}>
        <Text bold color="cyan">Workspace Admin: Deleted Users (Last {days} days)</Text>
      </Box>

      {error && (
        <Box marginBottom={1}><Text color="red">Error: {error}</Text></Box>
      )}
      
      {selectedUserToRecover !== null ? (
        <Box flexDirection="column" marginBottom={1} padding={1} borderStyle="round" borderColor="yellow">
           <Text bold color="yellow">Confirm Action: Recover User Account</Text>
           <Text>Are you sure you want to recover account: <Text bold>{selectedUserToRecover}</Text>?</Text>
           <Text color="gray">[y/Enter] to Confirm | [ESC] to Cancel</Text>
           
           {isRecovering && <Box marginTop={1}><Text color="cyan">Recovering user via Google Admin API...</Text></Box>}
           {recoveryStatus && <Box marginTop={1}><Text color={recoveryStatus.includes('Error') || recoveryStatus.includes('Failed') ? 'red' : 'green'}>{recoveryStatus}</Text></Box>}
           
           {!isRecovering && !recoveryStatus && (
              <Box marginTop={1}>
                 <Text>Confirm: </Text>
                 <TextInput value={confirmInput} onChange={setConfirmInput} onSubmit={handleRecoveryConfirm} />
              </Box>
           )}
        </Box>
      ) : loading && currentViewUsers.length === 0 ? (
        <Text color="yellow">Loading records from Google Workspace API...</Text>
      ) : currentViewUsers.length === 0 ? (
        <Text color="gray">No deleted users found on this page.</Text>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
           <SelectInput 
              items={currentViewUsers.map(u => {
                 const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
                 const label = `${u.userEmail} ${fullName ? `(${fullName})` : ''} - deleted ${u.deletionTime}`;
                 return { label, value: u.userEmail };
              })} 
              onSelect={handleSelectUser} 
           />
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
