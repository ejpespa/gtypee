/**
 * Result type for paginated API responses.
 * @template T - The type of items in the result
 */
export type PaginatedResult<T> = {
  /** Array of items in the current page */
  items: T[];
  /** Token to fetch the next page, if more results exist */
  nextPageToken?: string;
};

/**
 * Options for controlling pagination in list commands.
 */
export type PaginationOptions = {
  /** Maximum number of items to return per page */
  pageSize?: number;
  /** Token from a previous response to continue from */
  pageToken?: string;
};
