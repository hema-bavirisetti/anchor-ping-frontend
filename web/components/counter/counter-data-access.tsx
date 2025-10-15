'use client';

import { getCounterProgram, getCounterProgramId } from '@anchor-ping/anchor';
import { Program } from '@coral-xyz/anchor';
import { useConnection } from '@solana/wallet-adapter-react';
import { Cluster, PublicKey } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCluster } from '../cluster/cluster-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';

// -----------------------------------------------------------------------------
// Hook 1: useCounterProgram
// -----------------------------------------------------------------------------
export function useCounterProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();

  // Get program ID based on cluster (mainnet/devnet/localnet)
  const programId = useMemo(
    () => getCounterProgramId(cluster.network as Cluster),
    [cluster]
  );

  // Initialize program instance
  const program = getCounterProgram(provider);

  // Fetch all counter accounts
  const accounts = useQuery({
    queryKey: ['counter', 'all', { cluster }],
    queryFn: () => program.account.counter.all(),
  });

  // Fetch program account info (optional)
  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  // Initialize a new counter account
  const initialize = useMutation({
    mutationKey: ['counter', 'initialize', { cluster }],
    mutationFn: (keypair) =>
      program.methods
        .initialize()
        .accounts({ counter: keypair.publicKey })
        .signers([keypair])
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error('Failed to initialize account'),
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  };
}

// -----------------------------------------------------------------------------
// Hook 2: useCounterProgramAccount
// -----------------------------------------------------------------------------
export function useCounterProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program } = useCounterProgram();

  // Fetch specific counter account data
  const accountQuery = useQuery({
    queryKey: ['counter', 'fetch', { cluster, account }],
    queryFn: () => program.account.counter.fetch(account),
  });

  // Increment counter
  const incrementMutation = useMutation({
    mutationKey: ['counter', 'increment', { cluster, account }],
    mutationFn: () =>
      program.methods.increment().accounts({ counter: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx);
      return accountQuery.refetch();
    },
  });

  // Decrement counter
  const decrementMutation = useMutation({
    mutationKey: ['counter', 'decrement', { cluster, account }],
    mutationFn: () =>
      program.methods.decrement().accounts({ counter: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx);
      return accountQuery.refetch();
    },
  });

  return {
    accountQuery,
    incrementMutation,
    decrementMutation,
  };
}
